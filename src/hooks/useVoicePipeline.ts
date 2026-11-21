import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyVoiceCorrection,
  buildReadBackScript,
  computeFieldProvenanceSpans,
  extractStructuredVisitDeterministic,
} from '../shared/clinicalEngine';
import { detectDangerSigns } from '../shared/dangerSigns';
import { getLanguageConfig } from '../shared/languages';
import type {
  AcousticTelemetry,
  Beneficiary,
  DangerSignAnalysis,
  LanguageCode,
  StructuredVisitRecord,
  TranscriptProvenanceSpan,
  VisitType,
  VoicePipelineState,
} from '../shared/types';
import { api, getAuthToken } from '../utils/apiClient';

interface UseVoicePipelineOptions {
  language: LanguageCode;
  visitType: VisitType;
  workerId: string;
  beneficiaries: Beneficiary[];
  selectedBeneficiary: Beneficiary | null;
  isOnline: boolean;
  voiceSpeed?: number;
  onEmergencyDetected: (analysis: DangerSignAnalysis, transcript: string) => void;
}

const DEFAULT_TELEMETRY: AcousticTelemetry = {
  rmsDb: -54,
  snrEstimateDb: 18,
  noiseFloorDb: -54,
  noiseEnvironment: 'Quiet',
  vadActive: false,
  peakHz: 0,
};

export function useVoicePipeline(options: UseVoicePipelineOptions) {
  const {
    language,
    visitType,
    workerId,
    beneficiaries,
    selectedBeneficiary,
    isOnline,
    voiceSpeed = 1.0,
    onEmergencyDetected,
  } = options;

  const [pipelineState, setPipelineState] = useState<VoicePipelineState>('IDLE');
  const [waveformBars, setWaveformBars] = useState<number[]>(new Array(24).fill(0.06));
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [noiseWarning, setNoiseWarning] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<string>('Ready');
  const [ttfaMs, setTtfaMs] = useState<number | null>(null);
  const [structuredRecord, setStructuredRecord] = useState<StructuredVisitRecord | null>(null);
  const [ambiguityCandidates, setAmbiguityCandidates] = useState<Beneficiary[]>([]);
  const [correctionMode, setCorrectionMode] = useState(false);
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [acousticTelemetry, setAcousticTelemetry] = useState<AcousticTelemetry>(DEFAULT_TELEMETRY);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const speechEndpointRef = useRef<number | null>(null);
  const isSpeakingRef = useRef(false);
  const silenceStartRef = useRef<number | null>(null);
  const hadSpeechRef = useRef(false);
  const correctionModeRef = useRef(false);
  const currentRecordRef = useRef<StructuredVisitRecord | null>(null);
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);
  const accumulatedSecondsRef = useRef(0);
  const segmentStartMsRef = useRef<number>(0);
  const noiseFloorRef = useRef<number>(-52);

  useEffect(() => {
    correctionModeRef.current = correctionMode;
  }, [correctionMode]);

  useEffect(() => {
    currentRecordRef.current = structuredRecord;
  }, [structuredRecord]);

  const fieldProvenance = useMemo<TranscriptProvenanceSpan[]>(
    () => computeFieldProvenanceSpans(liveTranscript || structuredRecord?.sourceTranscript || '', structuredRecord),
    [liveTranscript, structuredRecord],
  );

  const stopPlayback = useCallback(() => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
  }, []);

  const speakText = useCallback(
    async (text: string, urgent = false, nextStateAfterSpeak: VoicePipelineState = 'WAITING_CONFIRMATION') => {
      stopPlayback();
      setPipelineState(urgent ? 'DANGER_ALERT' : 'SPEAKING');
      isSpeakingRef.current = true;
      const endpointTs = speechEndpointRef.current ?? Date.now();
      const clampedSpeed = Math.min(1.5, Math.max(0.7, voiceSpeed));

      if (isOnline) {
        try {
          const tts = await api.synthesizeSpeech({
            text,
            language,
            urgent,
            sessionId: sessionIdRef.current,
          });
          const measuredTtfa = Date.now() - endpointTs;
          setTtfaMs(measuredTtfa);

          if (!isSpeakingRef.current) return;

          if (tts.available !== false && tts.base64Wav && tts.mimeType) {
            const audio = new Audio(`data:${tts.mimeType};base64,${tts.base64Wav}`);
            audio.playbackRate = urgent ? Math.max(1.0, clampedSpeed) : clampedSpeed;
            activeAudioRef.current = audio;
            audio.onended = () => {
              isSpeakingRef.current = false;
              activeAudioRef.current = null;
              if (!urgent) {
                setPipelineState(nextStateAfterSpeak);
              }
            };
            audio.onerror = () => {
              isSpeakingRef.current = false;
              if (!urgent) setPipelineState(nextStateAfterSpeak);
            };
            await audio.play();
            return;
          }
        } catch {
          // Cleanly fall through to browser SpeechSynthesis
        }
      }

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = getLanguageConfig(language).bcp47;
        utterance.rate = urgent ? Math.max(1.05, clampedSpeed) : clampedSpeed;
        utterance.onstart = () => {
          setTtfaMs(Date.now() - endpointTs);
        };
        utterance.onend = () => {
          isSpeakingRef.current = false;
          if (!urgent) {
            setPipelineState(nextStateAfterSpeak);
          }
        };
        window.speechSynthesis.speak(utterance);
      } else {
        isSpeakingRef.current = false;
        if (!urgent) setPipelineState(nextStateAfterSpeak);
      }
    },
    [isOnline, language, stopPlayback, voiceSpeed],
  );

  const cleanupMedia = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // Ignore
      }
      wsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
        // Ignore
      }
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    isPausedRef.current = false;
    setWaveformBars(new Array(24).fill(0.06));
    setAcousticTelemetry((prev) => ({ ...prev, vadActive: false }));
  }, []);

  const processTranscript = useCallback(
    async (
      transcriptText: string,
      visitTypeOverride?: VisitType,
      beneficiaryOverride?: Beneficiary | null,
    ) => {
      const cleaned = transcriptText.trim();
      if (!cleaned) {
        setPipelineState('IDLE');
        setProviderStatus('No speech detected. Tap microphone to try again.');
        return;
      }

      const activeVisitType = visitTypeOverride ?? visitType;
      const activeBeneficiary =
        beneficiaryOverride !== undefined ? beneficiaryOverride : selectedBeneficiary;

      speechEndpointRef.current = Date.now();
      setLiveTranscript(cleaned);
      setPartialTranscript('');
      setPipelineState('PROCESSING');

      // 1. Voice Correction flow
      if (correctionModeRef.current && currentRecordRef.current) {
        setCorrectionMode(false);
        let outcome;
        if (isOnline) {
          try {
            outcome = await api.correctVisit(currentRecordRef.current, cleaned);
          } catch {
            outcome = applyVoiceCorrection(currentRecordRef.current, cleaned, beneficiaries);
          }
        } else {
          outcome = applyVoiceCorrection(currentRecordRef.current, cleaned, beneficiaries);
        }

        setStructuredRecord(outcome.updatedRecord);
        if (outcome.updatedField) {
          setHighlightedField(outcome.updatedField);
        }
        if (outcome.updatedRecord.dangerSignStatus === 'positive_detected') {
          onEmergencyDetected(outcome.updatedRecord.dangerAnalysis, cleaned);
          await speakText(getLanguageConfig(language).emergencyAnnouncement, true, 'DANGER_ALERT');
          return;
        }
        await speakText(outcome.spokenFeedback, false, 'WAITING_CONFIRMATION');
        return;
      }

      // 2. Parallel deterministic danger-sign check BEFORE waiting for full extraction
      const immediateDanger = detectDangerSigns(cleaned, activeVisitType);

      let extractedRecord: StructuredVisitRecord;
      let candidates: Beneficiary[] = [];

      if (isOnline) {
        try {
          const res = await api.extractVisit({
            transcript: cleaned,
            visitType: activeVisitType,
            language,
            selectedBeneficiaryCode: activeBeneficiary?.beneficiaryCode ?? null,
            sessionId: sessionIdRef.current,
          });
          extractedRecord = res.record;
          candidates = res.ambiguityCandidates;
        } catch {
          extractedRecord = extractStructuredVisitDeterministic({
            transcript: cleaned,
            visitType: activeVisitType,
            language,
            workerId,
            beneficiaries,
            selectedBeneficiary: activeBeneficiary,
            extractionSource: 'OFFLINE_DETERMINISTIC_PARSER',
          });
        }
      } else {
        extractedRecord = extractStructuredVisitDeterministic({
          transcript: cleaned,
          visitType: activeVisitType,
          language,
          workerId,
          beneficiaries,
          selectedBeneficiary: activeBeneficiary,
          extractionSource: 'OFFLINE_DETERMINISTIC_PARSER',
        });
      }

      setStructuredRecord(extractedRecord);
      setAmbiguityCandidates(candidates);

      if (
        immediateDanger.status === 'positive_detected' ||
        extractedRecord.dangerSignStatus === 'positive_detected'
      ) {
        const finalDanger =
          extractedRecord.dangerAnalysis.matches.length > 0
            ? extractedRecord.dangerAnalysis
            : immediateDanger;
        onEmergencyDetected(finalDanger, cleaned);
        await speakText(getLanguageConfig(language).emergencyAnnouncement, true, 'DANGER_ALERT');
        return;
      }

      setPipelineState('VERIFYING');
      const readBack = buildReadBackScript(extractedRecord, language);
      await speakText(readBack, false, 'WAITING_CONFIRMATION');
    },
    [
      beneficiaries,
      isOnline,
      language,
      onEmergencyDetected,
      selectedBeneficiary,
      speakText,
      visitType,
      workerId,
    ],
  );

  const stopListening = useCallback(async () => {
    isPausedRef.current = false;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pauseListening = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.pause();
      isPausedRef.current = true;
      accumulatedSecondsRef.current += Math.floor((Date.now() - segmentStartMsRef.current) / 1000);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setPipelineState('PAUSED');
      setProviderStatus('Recording paused — tap Resume to continue speaking');
    }
  }, []);

  const resumeListening = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'paused') {
      recorder.resume();
      isPausedRef.current = false;
      segmentStartMsRef.current = Date.now();
      silenceStartRef.current = null;
      timerRef.current = window.setInterval(() => {
        const elapsed =
          accumulatedSecondsRef.current + Math.floor((Date.now() - segmentStartMsRef.current) / 1000);
        setRecordingSeconds(elapsed);
      }, 500);
      setPipelineState('LISTENING');
      setProviderStatus(isOnline ? 'Streaming microphone active' : 'Offline capture resumed');
    }
  }, [isOnline]);

  const cancelListening = useCallback(() => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    } else {
      cleanupMedia();
      setPipelineState(currentRecordRef.current ? 'WAITING_CONFIRMATION' : 'IDLE');
    }
    setPartialTranscript('');
    setRecordingSeconds(0);
    setProviderStatus('Recording cancelled');
  }, [cleanupMedia]);

  const startListening = useCallback(
    async (isCorrection = false) => {
      stopPlayback();
      setMicError(null);
      setNoiseWarning(null);
      setCorrectionMode(isCorrection);
      setPartialTranscript('');
      setRecordingSeconds(0);
      accumulatedSecondsRef.current = 0;
      hadSpeechRef.current = false;
      silenceStartRef.current = null;
      isPausedRef.current = false;
      isCancelledRef.current = false;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicError('Microphone API unavailable in this browser context.');
        return;
      }

      try {
        if (isOnline) {
          try {
            const s = await api.startVoiceSession(language);
            sessionIdRef.current = s.sessionId;
          } catch {
            sessionIdRef.current = null;
          }
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
        streamRef.current = stream;

        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.72;
        source.connect(analyser);
        analyserRef.current = analyser;

        const token = getAuthToken();
        if (isOnline && token) {
          const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const wsUrl = `${wsProto}//${window.location.host}/ws/voice?token=${encodeURIComponent(
            token,
          )}&language=${encodeURIComponent(language)}&visitType=${encodeURIComponent(visitType)}`;
          try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;
            ws.onmessage = (event) => {
              const msg = JSON.parse(event.data) as {
                type: string;
                combinedTranscript?: string;
                dangerAnalysis?: DangerSignAnalysis;
                message?: string;
              };
              if (msg.type === 'INTERIM_TRANSCRIPT' && msg.combinedTranscript) {
                setPartialTranscript(msg.combinedTranscript);
              }
              if (msg.type === 'FINAL_TRANSCRIPT' && msg.combinedTranscript) {
                setLiveTranscript(msg.combinedTranscript);
              }
              if (msg.type === 'DANGER_EVENT' && msg.dangerAnalysis) {
                onEmergencyDetected(msg.dangerAnalysis, msg.combinedTranscript ?? '');
              }
              if (msg.type === 'PROVIDER_WARNING' && msg.message) {
                setProviderStatus(msg.message);
              }
            };
          } catch {
            // Non-blocking fallback
          }
        }

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          const wasCancelled = isCancelledRef.current;
          isCancelledRef.current = false;
          const blob = new Blob(chunksRef.current, { type: mimeType });
          cleanupMedia();

          if (wasCancelled || blob.size < 600) {
            setPipelineState(currentRecordRef.current ? 'WAITING_CONFIRMATION' : 'IDLE');
            return;
          }

          setPipelineState('PROCESSING');
          if (isOnline) {
            try {
              const reader = new FileReader();
              const base64Audio = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                  const res = String(reader.result || '');
                  resolve(res.split(',')[1] || '');
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });

              const stt = await api.transcribeAudio({
                base64Audio,
                mimeType,
                language,
                sessionId: sessionIdRef.current,
              });
              await processTranscript(stt.transcript);
              return;
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Speech transcription failed.';
              setMicError(msg);
              setPipelineState(currentRecordRef.current ? 'WAITING_CONFIRMATION' : 'IDLE');
              return;
            }
          } else {
            setMicError('Offline: Speech transcription provider requires network connection.');
            setPipelineState(currentRecordRef.current ? 'WAITING_CONFIRMATION' : 'IDLE');
          }
        };

        recorder.start(250);
        setPipelineState('LISTENING');
        setProviderStatus(isOnline ? 'Streaming microphone active' : 'Offline capture');

        segmentStartMsRef.current = Date.now();
        timerRef.current = window.setInterval(() => {
          const elapsed =
            accumulatedSecondsRef.current + Math.floor((Date.now() - segmentStartMsRef.current) / 1000);
          setRecordingSeconds(elapsed);
        }, 500);

        const freqData = new Uint8Array(analyser.frequencyBinCount);
        const timeData = new Uint8Array(analyser.fftSize);
        const tickWaveform = () => {
          if (!analyserRef.current) return;
          if (isPausedRef.current) {
            setWaveformBars(new Array(24).fill(0.06));
            rafRef.current = requestAnimationFrame(tickWaveform);
            return;
          }

          analyserRef.current.getByteFrequencyData(freqData);
          analyserRef.current.getByteTimeDomainData(timeData);

          const bars: number[] = [];
          let sum = 0;
          let peakBin = 0;
          let peakVal = 0;
          for (let i = 0; i < 24; i++) {
            const raw = freqData[i % freqData.length] ?? 0;
            const val = raw / 255;
            bars.push(Math.max(0.06, val));
            sum += val;
            if (raw > peakVal) {
              peakVal = raw;
              peakBin = i;
            }
          }
          setWaveformBars(bars);

          // Real time-domain RMS in dBFS
          let sqSum = 0;
          for (let i = 0; i < timeData.length; i++) {
            const norm = (timeData[i] - 128) / 128;
            sqSum += norm * norm;
          }
          const rms = Math.sqrt(sqSum / timeData.length);
          const rmsDb = Math.max(-60, Math.min(0, Math.round(20 * Math.log10(Math.max(rms, 0.001)))));
          const avgEnergy = sum / 24;
          const vadActive = avgEnergy > 0.14;

          if (!vadActive) {
            noiseFloorRef.current = Math.round(noiseFloorRef.current * 0.9 + rmsDb * 0.1);
          }
          const snrEstimateDb = Math.max(0, Math.round(rmsDb - noiseFloorRef.current));
          const noiseEnvironment: AcousticTelemetry['noiseEnvironment'] =
            avgEnergy > 0.38 || noiseFloorRef.current > -30
              ? 'Noisy Household'
              : noiseFloorRef.current > -42
                ? 'Moderate'
                : 'Quiet';

          const peakHz = Math.round((peakBin * (audioCtx.sampleRate / 2)) / freqData.length);
          setAcousticTelemetry({
            rmsDb,
            snrEstimateDb,
            noiseFloorDb: noiseFloorRef.current,
            noiseEnvironment,
            vadActive,
            peakHz,
          });

          if (avgEnergy > 0.38) {
            setNoiseWarning('High background noise detected — speak close to microphone.');
          }
          if (vadActive) {
            hadSpeechRef.current = true;
            silenceStartRef.current = null;
          } else if (hadSpeechRef.current) {
            if (!silenceStartRef.current) {
              silenceStartRef.current = Date.now();
            } else if (
              Date.now() - silenceStartRef.current > 2000 &&
              Date.now() - segmentStartMsRef.current > 1800
            ) {
              void stopListening();
              return;
            }
          }

          rafRef.current = requestAnimationFrame(tickWaveform);
        };
        rafRef.current = requestAnimationFrame(tickWaveform);
      } catch (err) {
        cleanupMedia();
        const message =
          err instanceof Error
            ? err.message
            : 'Microphone access denied. Allow microphone permission to record visit notes.';
        setMicError(message);
        setPipelineState('IDLE');
      }
    },
    [
      cleanupMedia,
      isOnline,
      language,
      onEmergencyDetected,
      processTranscript,
      stopListening,
      stopPlayback,
      visitType,
    ],
  );

  const bargeInInterrupt = useCallback(async () => {
    stopPlayback();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'BARGE_IN' }));
    }
    await startListening(true);
  }, [startListening, stopPlayback]);

  const resetPipeline = useCallback(() => {
    stopPlayback();
    cleanupMedia();
    setPipelineState('IDLE');
    setLiveTranscript('');
    setPartialTranscript('');
    setStructuredRecord(null);
    setAmbiguityCandidates([]);
    setCorrectionMode(false);
    setHighlightedField(null);
    setNoiseWarning(null);
    setMicError(null);
    setTtfaMs(null);
    setRecordingSeconds(0);
    setAcousticTelemetry(DEFAULT_TELEMETRY);
  }, [cleanupMedia, stopPlayback]);

  useEffect(() => {
    return () => {
      stopPlayback();
      cleanupMedia();
    };
  }, [cleanupMedia, stopPlayback]);

  return {
    pipelineState,
    setPipelineState,
    waveformBars,
    recordingSeconds,
    liveTranscript,
    partialTranscript,
    noiseWarning,
    micError,
    providerStatus,
    ttfaMs,
    structuredRecord,
    setStructuredRecord,
    ambiguityCandidates,
    setAmbiguityCandidates,
    correctionMode,
    highlightedField,
    setHighlightedField,
    fieldProvenance,
    acousticTelemetry,
    startListening,
    pauseListening,
    resumeListening,
    stopListening,
    cancelListening,
    bargeInInterrupt,
    speakText,
    stopPlayback,
    processTranscript,
    resetPipeline,
  };
}

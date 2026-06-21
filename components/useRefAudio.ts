"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Turn } from "@/lib/types";

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function audioContextConstructor() {
  const audioWindow = window as AudioWindow;
  return audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
}

function decodeBase64Audio(value: string): ArrayBuffer {
  const payload = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value;
  const binary = window.atob(payload.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function createUtterance(text: string) {
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();

  utterance.voice =
    voices.find((voice) => /Daniel|Alex|Google UK English Male/i.test(voice.name)) ??
    voices.find((voice) => voice.lang.startsWith("en")) ??
    null;
  utterance.rate = 0.98;
  utterance.pitch = 0.9;
  utterance.volume = 1;

  return utterance;
}

export function useRefAudio() {
  const [muted, setMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeCalloutId, setActiveCalloutId] = useState<string | null>(null);
  const mutedRef = useRef(false);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackGenerationRef = useRef(0);

  const unlockAudio = useCallback(() => {
    const AudioContextClass = audioContextConstructor();
    if (!AudioContextClass) return null;

    contextRef.current ??= new AudioContextClass();
    if (contextRef.current.state === "suspended") void contextRef.current.resume();
    return contextRef.current;
  }, []);

  const stopAudio = useCallback(() => {
    playbackGenerationRef.current += 1;

    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        // The source may already have ended. Cleanup should still continue.
      }
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setActiveCalloutId(null);
  }, []);

  const speakText = useCallback(
    (text: string, calloutId: string | null = null) => {
      if (mutedRef.current || !("speechSynthesis" in window)) {
        stopAudio();
        return;
      }

      stopAudio();
      const generation = playbackGenerationRef.current;
      const utterance = createUtterance(text);
      const finish = () => {
        if (generation !== playbackGenerationRef.current) return;
        setIsSpeaking(false);
        setActiveCalloutId(null);
      };

      utterance.onend = finish;
      utterance.onerror = finish;
      setIsSpeaking(true);
      setActiveCalloutId(calloutId);
      window.speechSynthesis.speak(utterance);
    },
    [stopAudio]
  );

  const playCallout = useCallback(
    async (turn: Turn) => {
      if (mutedRef.current || !turn.callout) return;

      if (!turn.callout.audioBase64) {
        speakText(turn.callout.text, turn.id);
        return;
      }

      stopAudio();
      const generation = playbackGenerationRef.current;
      setIsSpeaking(true);
      setActiveCalloutId(turn.id);

      try {
        const context = unlockAudio();
        if (!context) throw new Error("Web Audio is unavailable");
        await context.resume();

        const audioBuffer = await context.decodeAudioData(
          decodeBase64Audio(turn.callout.audioBase64)
        );
        if (generation !== playbackGenerationRef.current || mutedRef.current) return;

        const source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(context.destination);
        source.onended = () => {
          if (sourceRef.current === source) sourceRef.current = null;
          if (generation !== playbackGenerationRef.current) return;
          setIsSpeaking(false);
          setActiveCalloutId(null);
        };
        sourceRef.current = source;
        source.start();
      } catch {
        if (generation !== playbackGenerationRef.current || mutedRef.current) return;
        speakText(turn.callout.text, turn.id);
      }
    },
    [speakText, stopAudio, unlockAudio]
  );

  const toggleMuted = useCallback(() => {
    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    setMuted(nextMuted);

    if (nextMuted) stopAudio();
    else unlockAudio();
  }, [stopAudio, unlockAudio]);

  useEffect(() => {
    return () => {
      playbackGenerationRef.current += 1;
      if (sourceRef.current) {
        try {
          sourceRef.current.stop();
        } catch {
          // The source may already have ended.
        }
        sourceRef.current.disconnect();
      }
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      if (contextRef.current && contextRef.current.state !== "closed") {
        void contextRef.current.close();
      }
    };
  }, []);

  return {
    activeCalloutId,
    isSpeaking,
    muted,
    playCallout,
    stopAudio,
    toggleMuted,
    unlockAudio,
  };
}

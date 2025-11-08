
import { useState, useEffect, useCallback, useRef } from 'react';

export const useSpeechSynthesis = (textToSpeak: string) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(voice => voice.lang.startsWith('pt-BR'));
    
    if (ptVoice) {
      utterance.voice = ptVoice;
    }
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };
    
    utterance.onpause = () => {
      setIsSpeaking(true);
      setIsPaused(true);
    };
    
    utterance.onresume = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = (event) => {
        console.error('SpeechSynthesisUtterance.onerror', event);
        setIsSpeaking(false);
        setIsPaused(false);
    };
    
    utteranceRef.current = utterance;

    // Cleanup when component unmounts or text changes
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [textToSpeak]);

  const speak = useCallback(() => {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
    if (utteranceRef.current) {
      setIsPaused(false);
      window.speechSynthesis.speak(utteranceRef.current);
    }
  }, []);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
  }, []);

  const cancel = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  return { isSpeaking, isPaused, speak, pause, resume, cancel };
};

"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface VoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function VoiceInput({ value, onChange, placeholder = "整改措施...", className = "" }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  // 保持 ref 与最新值同步
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // 检查浏览器支持
  const SpeechRecognition = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const supported = !!SpeechRecognition;

  const createRecognition = useCallback(() => {
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }
      if (finalTranscript) {
        const currentValue = valueRef.current;
        const newValue = currentValue ? currentValue + finalTranscript : finalTranscript;
        onChangeRef.current(newValue);
      }
    };

    recognition.onerror = (event) => {
      console.warn("语音识别错误:", event.error);
      if (event.error !== "aborted" && event.error !== "no-speech" && event.error !== "audio-capture") {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onstart = () => {
      setIsListening(true);
    };

    return recognition;
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      // 停止识别
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // 忽略
        }
        recognitionRef.current = null;
      }
      setIsListening(false);
    } else {
      // 创建新的识别实例（每次都是新的，避免复用问题）
      const recognition = createRecognition();
      if (!recognition) return;
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (e) {
        console.warn("启动语音识别失败:", e);
        recognitionRef.current = null;
        setIsListening(false);
      }
    }
  }, [isListening, createRecognition]);

  return (
    <div className={`relative ${className}`}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none transition-all"
      />
      {supported && (
        <button
          type="button"
          onClick={toggleListening}
          className={`absolute right-2 top-2 p-1.5 rounded-lg transition-all ${
            isListening
              ? "bg-red-500 text-white animate-pulse shadow-lg"
              : "text-gray-400 hover:text-amber-500 hover:bg-amber-50"
          }`}
          title={isListening ? "点击停止语音输入" : "点击开始语音输入"}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            {isListening ? (
              <rect x="6" y="6" width="12" height="12" rx="2" />
            ) : (
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            )}
          </svg>
        </button>
      )}
      {isListening && (
        <div className="absolute -top-8 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap animate-pulse">
          正在录音...
        </div>
      )}
      {!supported && (
        <div className="absolute -top-8 right-0 bg-gray-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">
          浏览器不支持语音
        </div>
      )}
    </div>
  );
}

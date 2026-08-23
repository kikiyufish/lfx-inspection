"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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

  useEffect(() => {
    // 检查浏览器是否支持语音识别
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
    
    if (SpeechRecognition) {
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
          // 使用 ref 获取最新值，避免闭包问题
          const currentValue = valueRef.current;
          const newValue = currentValue ? currentValue + finalTranscript : finalTranscript;
          onChangeRef.current(newValue);
        }
      };
      
      recognition.onerror = (event) => {
        console.warn("语音识别错误:", event.error);
        // 忽略 aborted 和 no-speech 错误，这些是正常的
        if (event.error !== "aborted" && event.error !== "no-speech") {
          setIsListening(false);
        }
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
      if (recognitionRef.current && isListening) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // 忽略停止时的错误
        }
      }
    };
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // 忽略停止时的错误
      }
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn("启动语音识别失败:", e);
        setIsListening(false);
      }
    }
  }, [isListening]);

  return (
    <div className={`relative ${className}`}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none transition-all"
      />
      {isSupported && (
        <button
          type="button"
          onClick={toggleListening}
          className={`absolute right-2 top-2 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            isListening
              ? "bg-red-500 text-white animate-pulse"
              : "bg-gray-100 text-gray-500 hover:bg-amber-100 hover:text-amber-600"
          }`}
          title={isListening ? "点击停止语音输入" : "点击开始语音输入"}
        >
          {isListening ? (
            // 停止图标
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            // 麦克风图标
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          )}
        </button>
      )}
      {isListening && (
        <div className="absolute -top-6 left-0 text-xs text-red-500 animate-pulse">
          正在聆听...
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import posthog from 'posthog-js';

export default function Typewriter() {
  const [content, setContent] = useState('');
  const [volume, setVolume] = useState(0.3);
  const [customSounds, setCustomSounds] = useState<string[]>([]);
  const [currentSoundIndex, setCurrentSoundIndex] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(50); // milliseconds
  const [carriageReturnSounds, setCarriageReturnSounds] = useState<string[]>([]);
  const [currentCarriageReturnIndex, setCurrentCarriageReturnIndex] = useState(-1); // -1 means no sound
  const [isPaused, setIsPaused] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isEnterPressed, setIsEnterPressed] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lighting, setLighting] = useState(1.0); // 0.0 = dark room, 1.0 = normal lighting
  const [cursorScreenPosition, setCursorScreenPosition] = useState({ x: 50, y: 50 }); // Percentage position
  const [typewriterMode, setTypewriterMode] = useState(true); // True = paper feeds up, cursor stays centered - DEFAULT ON
  const [paperOffset, setPaperOffset] = useState(0); // Vertical offset for paper feeding
  const [selectedFont, setSelectedFont] = useState('Special Elite'); // Font selection
  const [showOnboarding, setShowOnboarding] = useState(false); // Show onboarding modal
  const [onboardingSlide, setOnboardingSlide] = useState(0); // Current onboarding slide
  const [copyNotification, setCopyNotification] = useState(false); // Show copy notification
  const [selectedBackground, setSelectedBackground] = useState('forest'); // Background selection
  const [pendingCharacters, setPendingCharacters] = useState(''); // Characters waiting to be displayed
  const [showClearConfirm, setShowClearConfirm] = useState(false); // Show clear confirmation modal
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const carriageAudioRef = useRef<HTMLAudioElement>(null);
  const bellAudioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const carriageFileInputRef = useRef<HTMLInputElement>(null);
  const lastKeystrokeTime = useRef(0);
  const pauseTimeout = useRef<NodeJS.Timeout | null>(null);
  const hiddenTextareaRef = useRef<HTMLDivElement>(null);
  const textureCanvasRef = useRef<HTMLCanvasElement>(null);

  const fontOptions = [
    { name: 'Special Elite', family: '"Special Elite", "Courier New", monospace' },
    { name: 'Gabriele', family: '"Gabriele", "Courier New", monospace' },
    { name: 'American Typewriter', family: '"American Typewriter", "Courier New", monospace' },
    { name: 'Courier New', family: '"Courier New", monospace' }
  ];

  const backgroundOptions = [
    { name: 'Forest', value: 'forest', description: 'Deep forest green with organic texture' },
    { name: 'Classic', value: 'classic', description: 'Original gray background' },
    { name: 'Warm', value: 'warm', description: 'Warm beige study room' },
    { name: 'Dark', value: 'dark', description: 'Dark charcoal for night writing' }
  ];

  const getFontFamily = () => {
    const font = fontOptions.find(f => f.name === selectedFont);
    return font ? font.family : fontOptions[0].family;
  };

  const getBackgroundStyle = () => {
    const baseOpacity = lighting;
    switch (selectedBackground) {
      case 'forest':
        return {
          background: `
            radial-gradient(ellipse at top left, rgba(42, 96, 80, ${0.1 * baseOpacity}) 0%, transparent 50%),
            radial-gradient(ellipse at bottom right, rgba(26, 82, 64, ${0.15 * baseOpacity}) 0%, transparent 50%),
            linear-gradient(135deg,
              rgb(${Math.round(26 * baseOpacity + (1-baseOpacity) * 40)}, ${Math.round(82 * baseOpacity + (1-baseOpacity) * 40)}, ${Math.round(64 * baseOpacity + (1-baseOpacity) * 40)}) 0%,
              rgb(${Math.round(42 * baseOpacity + (1-baseOpacity) * 60)}, ${Math.round(96 * baseOpacity + (1-baseOpacity) * 60)}, ${Math.round(80 * baseOpacity + (1-baseOpacity) * 60)}) 50%,
              rgb(${Math.round(35 * baseOpacity + (1-baseOpacity) * 50)}, ${Math.round(89 * baseOpacity + (1-baseOpacity) * 50)}, ${Math.round(75 * baseOpacity + (1-baseOpacity) * 50)}) 100%
            )
          `,
          backgroundSize: '800px 600px, 600px 800px, 100%',
          backgroundPosition: 'top left, bottom right, center',
          backgroundRepeat: 'no-repeat'
        };
      case 'warm':
        return {
          backgroundColor: `rgb(${Math.round(139 * baseOpacity + (1-baseOpacity) * 80)}, ${Math.round(125 * baseOpacity + (1-baseOpacity) * 80)}, ${Math.round(107 * baseOpacity + (1-baseOpacity) * 80)})`
        };
      case 'dark':
        return {
          backgroundColor: `rgb(${Math.round(45 * baseOpacity + (1-baseOpacity) * 20)}, ${Math.round(45 * baseOpacity + (1-baseOpacity) * 20)}, ${Math.round(50 * baseOpacity + (1-baseOpacity) * 20)})`
        };
      default: // classic
        return {
          backgroundColor: `rgb(${Math.round(200 * baseOpacity)}, ${Math.round(200 * baseOpacity)}, ${Math.round(200 * baseOpacity)})`
        };
    }
  };

  const copyAllText = () => {
    posthog.capture('text_copied', {
      character_count: content.length,
      line_count: content.split('\n').length
    });

    navigator.clipboard.writeText(content).then(() => {
      // Show notification on successful copy
      setCopyNotification(true);
      setTimeout(() => setCopyNotification(false), 2000);
    }).catch(() => {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      // Show notification for fallback too
      setCopyNotification(true);
      setTimeout(() => setCopyNotification(false), 2000);
    });
  };

  const clearAllContent = () => {
    setShowClearConfirm(true);
  };

  const confirmClear = () => {
    setContent('');
    setCursorPosition(0);
    setPaperOffset(0);
    localStorage.removeItem('typewriter-content');
    posthog.capture('content_cleared', {
      character_count_cleared: content.length
    });
    setShowClearConfirm(false);
  };

  const toggleFullscreen = async () => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);

    // Enter/exit browser fullscreen mode
    if (newFullscreenState) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.log('Fullscreen not supported or failed:', err);
      }
    } else {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch (err) {
        console.log('Exit fullscreen failed:', err);
      }
    }

    posthog.capture('fullscreen_toggled', {
      is_fullscreen: newFullscreenState
    });
  };

  const generatePaperTexture = () => {
    const canvas = textureCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match paper dimensions
    const paperWidth = 576; // 6 inches * 96 DPI
    const paperHeight = 768; // 8 inches * 96 DPI
    canvas.width = paperWidth;
    canvas.height = paperHeight;

    // Create paper texture with noise
    const imageData = ctx.createImageData(paperWidth, paperHeight);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Base cream color (FAF7F0)
      const baseR = 250;
      const baseG = 247;
      const baseB = 240;

      // Add subtle noise variation
      const noise = (Math.random() - 0.5) * 20;

      data[i] = Math.max(0, Math.min(255, baseR + noise));     // Red
      data[i + 1] = Math.max(0, Math.min(255, baseG + noise)); // Green
      data[i + 2] = Math.max(0, Math.min(255, baseB + noise)); // Blue
      data[i + 3] = 255; // Alpha
    }

    ctx.putImageData(imageData, 0, 0);

    // Add subtle grain pattern
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * paperWidth;
      const y = Math.random() * paperHeight;
      const size = Math.random() * 2;

      ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
      ctx.fillRect(x, y, size, size);
    }
  };

  const sounds = ['/sounds/keystroke.mp3', ...customSounds];
  const carriageReturnSoundsWithDefault = ['/sounds/carriage-return.mp3', ...carriageReturnSounds];

  useEffect(() => {
    // Pre-load the current keystroke sound
    audioRef.current = new Audio(sounds[currentSoundIndex]);
    audioRef.current.volume = volume;
  }, [currentSoundIndex, volume, customSounds]);

  useEffect(() => {
    // Pre-load carriage return sound - default to carriage-return.mp3 if no custom sound selected
    const soundIndex = currentCarriageReturnIndex >= 0 ? currentCarriageReturnIndex : 0;
    carriageAudioRef.current = new Audio(carriageReturnSoundsWithDefault[soundIndex]);
    carriageAudioRef.current.volume = volume;
  }, [currentCarriageReturnIndex, volume, carriageReturnSounds]);

  useEffect(() => {
    // Pre-load bell sound
    bellAudioRef.current = new Audio('/sounds/bell.mp3');
    bellAudioRef.current.volume = volume;
  }, [volume]);


  const playKeystrokeSound = () => {
    if (audioRef.current) {
      // Add variability to keystroke sounds
      const audio = audioRef.current;

      // Random pitch variation (±15%)
      const pitchVariation = 0.85 + Math.random() * 0.3; // 0.85 to 1.15
      audio.playbackRate = pitchVariation;

      // Random volume variation (±10%)
      const volumeVariation = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
      audio.volume = Math.min(volume * volumeVariation, 1);

      // Reset and play the sound
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Ignore audio play errors (user hasn't interacted yet)
      });
    }
  };

  const playBellSound = () => {
    if (bellAudioRef.current) {
      bellAudioRef.current.currentTime = 0;
      bellAudioRef.current.play().catch(() => {
        // Ignore audio play errors
      });
    }
  };

  const playCarriageReturnSound = (charactersOnLine: number) => {
    if (carriageAudioRef.current) {
      const audio = carriageAudioRef.current;

      // Calculate proportion based on characters (max line length of ~40 chars for this layout)
      const maxLineLength = 40;
      const proportion = Math.min(charactersOnLine / maxLineLength, 1);

      // Add minimum duration to make it sound less short
      const minProportion = 0.3; // Always play at least 30% of the audio
      const adjustedProportion = Math.max(proportion, minProportion);

      // Calculate start and end times - play from start but trim duration
      const fullDuration = audio.duration || 2; // Fallback to 2 seconds if duration not available
      const playDuration = fullDuration * adjustedProportion;

      audio.currentTime = 0;

      // Play the audio
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise.then(() => {
          // Set a timeout to pause the audio after the calculated duration
          setTimeout(() => {
            if (!audio.paused) {
              audio.pause();
              audio.currentTime = 0; // Reset for next play
            }
          }, playDuration * 1000);
        }).catch(() => {
          // Ignore audio play errors
        });
      }
    }
  };


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'audio/mpeg') {
      posthog.capture('custom_keystroke_sound_uploaded', {
        file_name: file.name,
        file_size: file.size
      });
      const url = URL.createObjectURL(file);
      setCustomSounds(prev => [...prev, url]);
    }
  };

  const handleCarriageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'audio/mpeg') {
      posthog.capture('custom_carriage_sound_uploaded', {
        file_name: file.name,
        file_size: file.size
      });
      const url = URL.createObjectURL(file);
      setCarriageReturnSounds(prev => [...prev, url]);
    }
  };

  const deleteSound = (index: number) => {
    if (index === 0) return; // Can't delete default sound

    const soundToDelete = customSounds[index - 1];
    URL.revokeObjectURL(soundToDelete);

    setCustomSounds(prev => prev.filter((_, i) => i !== index - 1));

    if (currentSoundIndex === index) {
      setCurrentSoundIndex(0);
    } else if (currentSoundIndex > index) {
      setCurrentSoundIndex(prev => prev - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Block backspace/delete keys - typewriters can't erase!
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      return;
    }

    // ESC key to exit fullscreen
    if (e.key === 'Escape' && isFullscreen) {
      e.preventDefault();
      toggleFullscreen();
      return;
    }

    // Handle arrow keys for cursor movement
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setCursorPosition(Math.max(0, cursorPosition - 1));
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setCursorPosition(Math.min(content.length, cursorPosition + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const lines = content.split('\n');
      const beforeCursor = content.slice(0, cursorPosition);
      const currentLineIndex = beforeCursor.split('\n').length - 1;
      const currentLineStart = beforeCursor.lastIndexOf('\n') + 1;
      const positionInLine = cursorPosition - currentLineStart;

      if (currentLineIndex > 0) {
        const prevLineStart = beforeCursor.slice(0, currentLineStart - 1).lastIndexOf('\n') + 1;
        const prevLineLength = currentLineStart - 1 - prevLineStart;
        const newPosition = prevLineStart + Math.min(positionInLine, prevLineLength);
        setCursorPosition(newPosition);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const lines = content.split('\n');
      const beforeCursor = content.slice(0, cursorPosition);
      const currentLineIndex = beforeCursor.split('\n').length - 1;
      const currentLineStart = beforeCursor.lastIndexOf('\n') + 1;
      const positionInLine = cursorPosition - currentLineStart;

      if (currentLineIndex < lines.length - 1) {
        const nextLineStart = content.indexOf('\n', cursorPosition) + 1;
        const nextLineEnd = content.indexOf('\n', nextLineStart);
        const nextLineLength = nextLineEnd === -1 ? content.length - nextLineStart : nextLineEnd - nextLineStart;
        const newPosition = nextLineStart + Math.min(positionInLine, nextLineLength);
        setCursorPosition(newPosition);
      }
      return;
    }

    // Handle character input
    if (e.key.length === 1 || e.key === 'Enter') {
      e.preventDefault();

      // If we're in a pause, ignore all input
      if (isPaused) {
        return;
      }

      const character = e.key === 'Enter' ? '\n' : e.key;

      // Check line length limit (40 characters per line for typewriter authenticity)
      if (character !== '\n') {
        const lines = content.split('\n');
        const currentLineIndex = content.slice(0, cursorPosition).split('\n').length - 1;
        const currentLine = lines[currentLineIndex] || '';
        const maxLineLength = 40;

        if (currentLine.length >= maxLineLength) {
          // Line is full, play bell and prevent adding character
          playBellSound();
          posthog.capture('line_limit_reached', {
            line_length: currentLine.length,
            character_attempted: character
          });
          return;
        }
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeystrokeTime.current;

      // If typing too fast, trigger a 1-second pause
      if (timeDiff < typingSpeed && typingSpeed > 0) {
        setIsPaused(true);
        posthog.capture('typing_too_fast_paused', {
          typing_speed_limit: typingSpeed,
          time_diff: timeDiff
        });

        // Clear any existing timeout
        if (pauseTimeout.current) {
          clearTimeout(pauseTimeout.current);
        }

        // Set a 1-second pause
        pauseTimeout.current = setTimeout(() => {
          setIsPaused(false);
          pauseTimeout.current = null;
        }, 1000);

        return;
      }

      lastKeystrokeTime.current = currentTime;

      // Handle Enter key
      if (character === '\n') {
        setIsEnterPressed(true);

        // Calculate characters on current line
        const lines = content.split('\n');
        const currentLineIndex = content.slice(0, cursorPosition).split('\n').length - 1;
        const charactersOnCurrentLine = lines[currentLineIndex]?.length || 0;

        playCarriageReturnSound(charactersOnCurrentLine);
        posthog.capture('carriage_return_used');

        // In typewriter mode, move paper up to keep cursor centered
        if (typewriterMode) {
          const lineHeight = 28; // Match the line height used in styling
          setPaperOffset(prev => prev + lineHeight);
        }
      } else {
        // Only play keystroke sound for regular characters
        playKeystrokeSound();
        setIsEnterPressed(false);
      }

      // Overwrite mode: replace character at cursor position instead of inserting
      let finalText;
      if (cursorPosition < content.length && character !== '\n') {
        // Overwrite existing character(s)
        finalText = content.slice(0, cursorPosition) + character + content.slice(cursorPosition + 1);
      } else {
        // At end of text or adding newline, append normally
        finalText = content + character;
      }

      // Update content immediately - no delays
      setContent(finalText);
      const newCursorPos = cursorPosition + 1;
      setCursorPosition(newCursorPos);
      setLastActivityTime(Date.now());

      // Track typing activity every 50 characters
      if (finalText.length > 0 && finalText.length % 50 === 0) {
        posthog.capture('typing_milestone', {
          character_count: finalText.length,
          line_count: finalText.split('\n').length,
          session_duration: Date.now() - lastActivityTime
        });
      }
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Simply prevent the textarea from changing - we handle all input via onKeyDown
    e.preventDefault();
  };

  const updateCursorScreenPosition = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const text = content.slice(0, cursorPosition);

      // Create a temporary span to measure text dimensions
      const measureElement = document.createElement('span');
      measureElement.style.fontFamily = getFontFamily();
      measureElement.style.fontSize = '1.25rem'; // text-xl
      measureElement.style.lineHeight = '1.75rem'; // leading-7
      measureElement.style.whiteSpace = 'pre-wrap';
      measureElement.style.visibility = 'hidden';
      measureElement.style.position = 'absolute';
      measureElement.textContent = text;

      document.body.appendChild(measureElement);

      // Get the writing area bounds
      const writingArea = textarea.parentElement;
      if (writingArea) {
        const writingRect = writingArea.getBoundingClientRect();
        const lines = text.split('\n');
        const currentLineIndex = lines.length - 1;
        const currentLineLength = lines[currentLineIndex]?.length || 0;

        // Approximate cursor position (this is a simplified calculation)
        const charWidth = 15; // Approximate character width for typewriter font
        const lineHeight = 28; // 1.75rem line height

        const localX = 48 + (currentLineLength * charWidth); // 48px = p-12 padding
        const localY = 48 + (currentLineIndex * lineHeight); // 48px = p-12 padding

        // Convert to screen percentage
        const screenX = ((writingRect.left + localX) / window.innerWidth) * 100;
        const screenY = ((writingRect.top + localY) / window.innerHeight) * 100;

        setCursorScreenPosition({
          x: Math.min(Math.max(screenX, 10), 90), // Clamp between 10% and 90%
          y: Math.min(Math.max(screenY, 10), 90)
        });
      }

      document.body.removeChild(measureElement);
    }
  };

  const handleCursorChange = () => {
    if (textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart);
      updateCursorScreenPosition();
    }
  };

  useEffect(() => {
    // Generate paper texture
    generatePaperTexture();

    // Check if user has seen onboarding before
    const hasSeenOnboarding = localStorage.getItem('typewriter-onboarding-seen');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }

    // Load saved content from localStorage
    const savedContent = localStorage.getItem('typewriter-content');
    if (savedContent) {
      setContent(savedContent);
    }

    // Track session start
    posthog.capture('typewriter_session_started');

    // Listen for fullscreen changes (when user exits with F11 or ESC)
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen]);


  // Initial focus on mount
  useEffect(() => {
    if (textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 200);
    }
  }, []);

  // Update cursor screen position when content or cursor position changes
  useEffect(() => {
    updateCursorScreenPosition();
  }, [content, cursorPosition]);

  // Auto-save content to localStorage whenever it changes
  useEffect(() => {
    if (content) {
      localStorage.setItem('typewriter-content', content);
    }
  }, [content]);


  const onboardingSlides = [
    {
      title: "Welcome",
      content: "This typewriter removes distractions\nand frees your mind to think.\n\nLet us show you how."
    },
    {
      title: "No Going Back",
      content: "You cannot delete what you write.\nYour mind stops editing itself\nand starts flowing.\n\nThink before you type.\nBe true to your thoughts."
    },
    {
      title: "Slow Down",
      content: "Type too fast\nand the machine jams.\n\nThis rhythm helps your thoughts\nform before they reach the page.\n\nLike breathing.\nLike walking."
    },
    {
      title: "Just You",
      content: "No spell check.\nNo suggestions.\nNo counts.\nNo menus.\n\nJust you\nand your thoughts."
    },
    {
      title: "The Journey",
      content: "No save button.\nNo files to manage.\nJust copy your words when done.\n\nFocus on the thinking,\nnot the document."
    }
  ];

  const nextSlide = () => {
    if (onboardingSlide < onboardingSlides.length - 1) {
      setOnboardingSlide(prev => prev + 1);
    } else {
      setShowOnboarding(false);
      localStorage.setItem('typewriter-onboarding-seen', 'true');
      posthog.capture('onboarding_completed');
    }
  };

  const skipOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('typewriter-onboarding-seen', 'true');
    posthog.capture('onboarding_skipped');
  };

  return (
    <div
      className="h-screen w-screen relative overflow-hidden transition-all duration-500"
      style={getBackgroundStyle()}
    >
      {/* Forest background texture overlay */}
      {selectedBackground === 'forest' && (
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 1px, transparent 1px),
              radial-gradient(circle at 80% 80%, rgba(0,0,0,0.05) 1px, transparent 1px),
              radial-gradient(circle at 40% 60%, rgba(255,255,255,0.08) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px, 45px 45px, 60px 60px'
          }}
        />
      )}
      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-lg mx-4 text-center relative">
            <div className="mb-6">
              <div className="flex justify-center mb-4">
                {onboardingSlides.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 mx-1 rounded-full ${
                      index === onboardingSlide ? 'bg-gray-800' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">{onboardingSlides[onboardingSlide].title}</h2>
              <div className="text-gray-600 leading-relaxed whitespace-pre-line">{onboardingSlides[onboardingSlide].content}</div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={skipOnboarding}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Skip
              </button>

              <button
                onClick={nextSlide}
                className="bg-gray-800 text-white px-6 py-2 rounded hover:bg-gray-900 transition-colors"
              >
                {onboardingSlide < onboardingSlides.length - 1 ? 'Next' : 'Start Writing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top right controls - copy and fullscreen */}
      <div className="fixed top-4 right-4 z-50 flex gap-3">

        {/* Copy button */}
        <div className="relative">
          <button
            onClick={copyAllText}
            className="text-black text-lg font-bold opacity-30 hover:opacity-80 transition-opacity bg-transparent border-none outline-none"
            title="Copy all text"
          >
            ⧉
          </button>
          {/* Copy notification */}
          {copyNotification && (
            <div className="absolute top-8 -left-4 bg-black text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
              Copied!
            </div>
          )}
        </div>

        {/* Clear contents button */}
        <button
          onClick={clearAllContent}
          className="text-black text-lg font-bold opacity-30 hover:opacity-80 transition-opacity bg-transparent border-none outline-none"
          title="Clear all content"
        >
          🗑
        </button>

        {/* Fullscreen toggle button */}
        <button
          onClick={toggleFullscreen}
          className="text-black text-lg font-bold opacity-30 hover:opacity-80 transition-opacity bg-transparent border-none outline-none"
          title={isFullscreen ? "Exit fullscreen (ESC)" : "Enter fullscreen"}
        >
          {isFullscreen ? "×" : "⛶"}
        </button>
      </div>

      {/* Paper area */}
      <div className={`flex ${typewriterMode ? 'items-center' : 'items-start'} justify-center ${isFullscreen ? 'pt-0 pb-0 h-screen' : 'pt-16 pb-8 h-full'} overflow-auto`}>
        {/* Spotlight/Vignette effect focused on cursor position */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-500"
          style={{
            background: `radial-gradient(ellipse 600px 400px at ${cursorScreenPosition.x}% ${cursorScreenPosition.y}%, transparent 20%, rgba(0,0,0,${0.6 - lighting * 0.6}) 60%)`,
            opacity: 1 - lighting * 0.3
          }}
        />

        {/* Single sheet of paper - smaller size */}
        <div
          className="w-[6in] h-[8in] shadow-2xl relative transition-all duration-500"
          style={{
            backgroundColor: `rgb(${Math.round(250 * lighting)}, ${Math.round(247 * lighting)}, ${Math.round(240 * lighting)})`,
            boxShadow: `0 25px 50px -12px rgba(0, 0, 0, ${0.25 + (1 - lighting) * 0.5})`,
            transform: typewriterMode ? `translateY(calc(20vh - ${paperOffset}px))` : 'translateY(0)',
            marginTop: typewriterMode ? '20vh' : '0',
            marginBottom: typewriterMode ? '20vh' : '0'
          }}
        >
          {/* Paper texture canvas overlay */}
          <canvas
            ref={textureCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
            style={{ mixBlendMode: 'multiply' }}
          />

          {/* Writing area */}
          <div className="p-12 h-full overflow-auto relative" onClick={() => textareaRef.current?.focus()}>

            {/* Visual text display */}
            <div
              className="relative text-xl leading-7 text-gray-800 whitespace-pre-wrap overflow-hidden"
              style={{
                fontFamily: getFontFamily(),
                minHeight: '28px',
                wordBreak: 'keep-all',
                overflowWrap: 'normal'
              }}
            >
              {content.slice(0, cursorPosition)}
              {/* Custom cursor - use inline-block to match text baseline */}
              <span className="inline-block relative" style={{ verticalAlign: 'baseline', lineHeight: '1.75rem' }}>
                <span className="absolute text-black text-lg" style={{ bottom: '0px', left: '0' }}>
                  _
                </span>
                {/* Invisible character to maintain line height */}
                <span className="opacity-0">|</span>
              </span>
              {content.slice(cursorPosition)}
            </div>

            {/* Hidden textarea for input capture */}
            <textarea
              ref={textareaRef}
              value=""
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onSelect={handleCursorChange}
              onClick={handleCursorChange}
              className="absolute inset-0 w-full h-full opacity-0 bg-transparent border-none outline-none resize-none z-20 pointer-events-auto"
              style={{
                caretColor: 'transparent',
                color: 'transparent'
              }}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              autoFocus
            />
          </div>
        </div>
      </div>

      {/* Clear confirmation modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div
            className="bg-cream relative rounded-lg shadow-2xl max-w-md mx-4"
            style={{
              backgroundColor: '#F5F5DC',
              fontFamily: '"Special Elite", "Courier New", monospace',
              border: '2px solid #8B4513',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 2px 4px 0 rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="p-8 text-center">
              <div className="mb-6">
                <div className="text-6xl mb-4">🗑</div>
                <h2 className="text-2xl font-bold text-black mb-3">Clear All Content?</h2>
                <p className="text-black opacity-80">
                  This will permanently delete all your typed content.
                  <br />
                  <strong>This cannot be undone.</strong>
                </p>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-6 py-3 bg-gray-200 text-black rounded border-2 border-gray-400 hover:bg-gray-300 transition-colors font-bold"
                  style={{
                    fontFamily: '"Special Elite", "Courier New", monospace',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClear}
                  className="px-6 py-3 bg-red-600 text-white rounded border-2 border-red-700 hover:bg-red-700 transition-colors font-bold"
                  style={{
                    fontFamily: '"Special Elite", "Courier New", monospace',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
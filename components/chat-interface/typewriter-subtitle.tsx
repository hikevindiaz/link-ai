import React, { useState, useEffect, useRef, useCallback } from 'react';

interface TypewriterSubtitleProps {
  questions: string[];
  typingDelay?: number;
  eraseDelay?: number;
  pauseDelay?: number;
}

const TypewriterSubtitle: React.FC<TypewriterSubtitleProps> = ({
  questions,
  typingDelay = 4,
  eraseDelay = 4,
  pauseDelay = 100,
}) => {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null); // Ref for timer ID

  useEffect(() => {
    // Function to clear the timer safely
    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const handleTyping = () => {
      // Ensure questions[questionIndex] is valid before proceeding
      if (!questions || questions.length === 0 || !questions[questionIndex]) {
         clearTimer(); // Stop if no valid questions
         setDisplayedText(''); // Clear text if questions disappear
         return;
      }
      
      const currentQuestion = questions[questionIndex];

      if (isDeleting) {
        // --- Deleting ---
        if (charIndex > 0) {
          setDisplayedText(currentQuestion.substring(0, charIndex - 1));
          setCharIndex((prev) => prev - 1);
          timerRef.current = setTimeout(handleTyping, eraseDelay);
        } else {
          // Finished deleting
          setIsDeleting(false);
          setQuestionIndex((prevIndex) => (prevIndex + 1) % questions.length);
          // Pause *after* deleting before starting to type next question
          timerRef.current = setTimeout(handleTyping, pauseDelay); 
        }
      } else {
        // --- Typing ---
        if (charIndex < currentQuestion.length) {
          setDisplayedText(currentQuestion.substring(0, charIndex + 1));
          setCharIndex((prev) => prev + 1);
          timerRef.current = setTimeout(handleTyping, typingDelay);
        } else {
          // Finished typing, pause then start deleting
          timerRef.current = setTimeout(() => {
            setIsDeleting(true);
            handleTyping(); // Start deleting immediately after pause
          }, pauseDelay);
        }
      }
    };

    // Clear previous timer before starting new one
    clearTimer(); 

    // Start the effect
    // Add a slight initial delay before the first character appears, similar to pauseDelay
    timerRef.current = setTimeout(handleTyping, pauseDelay); 

    // Cleanup function: Clear timer on unmount or when dependencies change
    return clearTimer;

  }, [
    // Dependencies: effect re-runs if these change
    charIndex, 
    isDeleting, 
    questionIndex, 
    questions, 
    typingDelay, 
    eraseDelay, 
    pauseDelay
  ]);

  // Add a blinking cursor effect
  // No blink while deleting or paused after typing
  const isPaused = isDeleting || (charIndex === (questions[questionIndex]?.length || 0) && !isDeleting);
  const cursorClass = isPaused ? 'animate-none' : 'animate-pulse';

  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <p className="text-lg text-gray-600 dark:text-gray-400 mt-4 h-6"> {/* Fixed height */}
      {displayedText}
      <span className={`ml-1 inline-block w-px h-5 bg-gray-600 dark:bg-gray-400 ${cursorClass}`}></span>
    </p>
  );
};

export default TypewriterSubtitle;

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LongPressWrapperProps<T> {
  children: React.ReactNode;
  onTap?: (item: T) => void;
  onDoubleTap?: (item: T) => void;
  onSwipeLeft?: (item: T) => void;
  onLongPress?: (item: T) => void;
  className?: string;
  disabled?: boolean;
  item: T;
  swipeDeleteIcon?: React.ElementType;
}

// FIX: Converted from a const arrow function to a function declaration to fix
// a TypeScript type inference issue with generic components, which was causing
// a "missing children" error in consuming components.
function LongPressWrapper<T extends {}>({ 
  children, 
  onTap, 
  onDoubleTap, 
  onSwipeLeft, 
  onLongPress,
  className = "",
  disabled = false,
  item,
  swipeDeleteIcon: SwipeDeleteIcon
}: LongPressWrapperProps<T>) {
  const [isPressed, setIsPressed] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [swipeDistance, setSwipeDistance] = useState(0);
  
  // FIX: Use ReturnType<typeof setTimeout> for environment-agnostic timer types instead of NodeJS.Timeout.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // FIX: Use ReturnType<typeof setTimeout> for environment-agnostic timer types instead of NodeJS.Timeout.
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapCount = useRef(0);
  const hasMoved = useRef(false);
  const hasTriggeredLongPress = useRef(false);
  const isScrolling = useRef(false);
  const elementRef = useRef<HTMLDivElement>(null);
  
  const LONG_PRESS_DURATION = 500;
  const DOUBLE_TAP_DELAY = 300;
  const SWIPE_THRESHOLD = 50;
  const MOVE_THRESHOLD = 10;
  const SCROLL_THRESHOLD = 5;
  const MAX_SWIPE_DISTANCE = 80;

  const springConfig = { 
    type: "spring", 
    stiffness: 300, 
    damping: 30 
  };
  
  const whileTapConfig = { 
    scale: 0.98,
    transition: { duration: 0.1 }
  };

  const clearTimers = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    setIsPressed(false);
    setSwipeDistance(0);
    hasMoved.current = false;
    hasTriggeredLongPress.current = false;
    isScrolling.current = false;
    tapCount.current = 0;
  }, []);

  const getEventPos = useCallback((e: TouchEvent | MouseEvent) => {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if ('changedTouches' in e && e.changedTouches.length > 0) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    if ('clientX' in e && 'clientY' in e) {
      return { x: e.clientX, y: e.clientY };
    }
    return { x: 0, y: 0 };
  }, []);

  const calculateDistance = useCallback((pos1: {x: number, y: number}, pos2: {x: number, y: number}) => {
    return Math.sqrt(
      Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2)
    );
  }, []);

  const handleStart = useCallback((e: TouchEvent | MouseEvent) => {
    if (disabled) return;
    
    const pos = getEventPos(e);
    if (isNaN(pos.x) || isNaN(pos.y)) return;
    
    setStartPos(pos);
    setIsPressed(true);
    setSwipeDistance(0);
    
    hasMoved.current = false;
    hasTriggeredLongPress.current = false;
    isScrolling.current = false;

    pressTimer.current = setTimeout(() => {
      if (!hasMoved.current && !hasTriggeredLongPress.current) {
        hasTriggeredLongPress.current = true;
        onLongPress?.(item);
      }
    }, LONG_PRESS_DURATION);
  }, [disabled, getEventPos, onLongPress, item]);

  const handleMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (disabled || !isPressed) return;

    const pos = getEventPos(e);
    
    const distance = calculateDistance(startPos, pos);
    const deltaX = pos.x - startPos.x;
    const deltaY = pos.y - startPos.y;
    
    if (distance > MOVE_THRESHOLD) {
      hasMoved.current = true;
      
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
      const isVertical = Math.abs(deltaY) > Math.abs(deltaX);
      
      if (isVertical && Math.abs(deltaY) > SCROLL_THRESHOLD) {
        isScrolling.current = true;
        setSwipeDistance(0);
        clearTimers();
        return;
      }
      
      if (isHorizontal) {
        try {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
        } catch (error) {}
        
        if (deltaX < 0) {
          const swipe = Math.min(Math.abs(deltaX), MAX_SWIPE_DISTANCE);
          setSwipeDistance(swipe);
        } else {
          setSwipeDistance(0);
        }
      }
    }
    
    if (hasMoved.current && pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, [disabled, isPressed, startPos, calculateDistance, clearTimers, getEventPos]);

  const handleEnd = useCallback((e: TouchEvent | MouseEvent) => {
    if (disabled) return;
    
    clearTimers();
    
    const pos = getEventPos(e);
    const distance = calculateDistance(startPos, pos);
    const deltaX = pos.x - startPos.x;
    
    if (isScrolling.current) {
      resetState();
      return;
    }
    
    if (distance > SWIPE_THRESHOLD) {
      if (deltaX < -SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(pos.y - startPos.y)) {
        try {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
        } catch (error) {}
        onSwipeLeft?.(item);
        resetState();
        return;
      }
    }
    
    if (!hasMoved.current && !hasTriggeredLongPress.current) {
      try {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
      } catch (error) {}
      
      tapCount.current += 1;
      
      if (tapCount.current === 1) {
        tapTimer.current = setTimeout(() => {
          if (tapCount.current === 1) {
            onTap?.(item);
          }
          resetState();
        }, DOUBLE_TAP_DELAY);
      } else if (tapCount.current === 2) {
        if(tapTimer.current) clearTimeout(tapTimer.current);
        onDoubleTap?.(item);
        resetState();
      }
    } else {
      resetState();
    }
  }, [
    disabled, clearTimers, getEventPos, calculateDistance, startPos, 
    resetState, onSwipeLeft, onTap, onDoubleTap, item
  ]);

  const handleCancel = useCallback(() => {
    clearTimers();
    resetState();
  }, [clearTimers, resetState]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const touchStartHandler = (e: TouchEvent) => handleStart(e);
    const touchMoveHandler = (e: TouchEvent) => handleMove(e);
    const touchEndHandler = (e: TouchEvent) => handleEnd(e);
    const touchCancelHandler = (e: TouchEvent) => handleCancel();

    element.addEventListener('touchstart', touchStartHandler, { passive: false });
    element.addEventListener('touchmove', touchMoveHandler, { passive: false });
    element.addEventListener('touchend', touchEndHandler, { passive: false });
    element.addEventListener('touchcancel', touchCancelHandler, { passive: false });

    return () => {
      element.removeEventListener('touchstart', touchStartHandler);
      element.removeEventListener('touchmove', touchMoveHandler);
      element.removeEventListener('touchend', touchEndHandler);
      element.removeEventListener('touchcancel', touchCancelHandler);
    };
  }, [handleStart, handleMove, handleEnd, handleCancel]);

  useEffect(() => {
    return () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
      if (tapTimer.current) clearTimeout(tapTimer.current);
    };
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const showDeleteButton = swipeDistance > SWIPE_THRESHOLD;
  
  const handleReactMouseStart = (e: React.MouseEvent) => handleStart(e.nativeEvent);
  const handleReactMouseMove = (e: React.MouseEvent) => handleMove(e.nativeEvent);
  const handleReactMouseEnd = (e: React.MouseEvent) => handleEnd(e.nativeEvent);
  const handleReactMouseCancel = () => handleCancel();

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <motion.div
        ref={elementRef}
        className={`${className} ${isPressed && !isScrolling.current ? 'pressed' : ''}`}
        style={{ 
          x: -swipeDistance,
          touchAction: 'pan-y',
          userSelect: 'none',
        }}
        transition={springConfig}
        onMouseDown={handleReactMouseStart}
        onMouseMove={handleReactMouseMove}
        onMouseUp={handleReactMouseEnd}
        onMouseLeave={handleReactMouseCancel}
        onContextMenu={handleContextMenu}
        whileTap={swipeDistance === 0 ? whileTapConfig : {}}
      >
        {children}
      </motion.div>
      
      <AnimatePresence>
        {showDeleteButton && SwipeDeleteIcon && (
          <div className="absolute top-0 right-4 h-full flex items-center pointer-events-none">
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={(e) => {
                e.stopPropagation();
                onSwipeLeft?.(item);
              }}
              className="bg-red-500 text-white p-3 rounded-2xl shadow-lg z-10 pointer-events-auto"
              aria-label="Delete item"
            >
              <SwipeDeleteIcon className="w-5 h-5" />
            </motion.button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LongPressWrapper;
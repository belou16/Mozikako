/**
 * MOZIKAKO — Audio Player Hook
 * Controls HTML5 Audio for 30s song previews
 */
import { useState, useRef, useEffect, useCallback } from 'react';

export function useAudioPlayer() {
  const audioRef = useRef(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);       // 0–100
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isLoading, setIsLoading] = useState(false);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);

  // Init audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    });
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
      setIsLoading(false);
    });
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(0);
      nextTrack();
    });
    audio.addEventListener('waiting', () => setIsLoading(true));
    audio.addEventListener('canplay', () => setIsLoading(false));
    audio.addEventListener('error', () => setIsLoading(false));

    return () => {
      audio.pause();
      audio.src = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playTrack = useCallback(async (track, trackQueue = null) => {
    const audio = audioRef.current;
    if (!audio || !track.preview) return;

    if (currentTrack?.id === track.id && audio.src) {
      // Toggle same track
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
      return;
    }

    // New track
    audio.pause();
    setIsLoading(true);
    setCurrentTrack(track);
    audio.src = track.preview;
    audio.load();

    if (trackQueue) {
      setQueue(trackQueue);
      setQueueIndex(trackQueue.findIndex(t => t.id === track.id));
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch (e) {
      console.warn('Playback failed:', e);
      setIsPlaying(false);
    }
  }, [currentTrack, isPlaying]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      await audio.play();
      setIsPlaying(true);
    }
  }, [isPlaying, currentTrack]);

  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;
    const next = (queueIndex + 1) % queue.length;
    setQueueIndex(next);
    playTrack(queue[next], queue);
  }, [queue, queueIndex, playTrack]);

  const prevTrack = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (queue.length === 0) return;
    const prev = (queueIndex - 1 + queue.length) % queue.length;
    setQueueIndex(prev);
    playTrack(queue[prev], queue);
  }, [queue, queueIndex, playTrack]);

  const seek = useCallback((pct) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = (pct / 100) * audio.duration;
  }, []);

  const changeVolume = useCallback((val) => {
    const audio = audioRef.current;
    setVolume(val);
    if (audio) audio.volume = val;
  }, []);

  const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return {
    currentTrack, isPlaying, progress, duration,
    currentTime, volume, isLoading, queue,
    playTrack, togglePlay, nextTrack, prevTrack,
    seek, changeVolume, formatTime,
  };
}

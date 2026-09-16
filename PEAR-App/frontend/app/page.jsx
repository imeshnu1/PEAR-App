'use client'

import React, { useState, useEffect } from 'react';

class NotificationManager {
  constructor() {
    this.audioContext = null;
    this.initAudio();
  }

  initAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
    } catch (e) {
      console.log('Web Audio API not available');
    }
  }

  beep(frequency = 800, duration = 200) {
    if (!this.audioContext) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.frequency.value = frequency;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
    osc.start(this.audioContext.currentTime);
    osc.stop(this.audioContext.currentTime + duration / 1000);
  }

  vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  matchFound() {
    this.beep(523, 150);
    setTimeout(() => this.beep(659, 150), 160);
    this.vibrate([100, 50, 100, 50, 100]);
  }

  warning() {
    this.beep(600, 300);
    this.vibrate([150, 100, 150]);
  }

  urgent() {
    this.beep(800, 250);
    this.vibrate([200, 50, 200, 50, 200]);
  }

  critical() {
    this.beep(1000, 200);
    setTimeout(() => this.beep(1000, 200), 250);
    setTimeout(() => this.beep(1000, 200), 500);
    this.vibrate([300, 100, 300, 100, 300]);
  }

  success() {
    this.beep(523, 150);
    setTimeout(() => this.beep(659, 150), 160);
    setTimeout(() => this.beep(784, 200), 320);
    this.vibrate([100, 50, 100, 50, 100, 50, 100, 50, 100]);
  }

  mutualMatch() {
    this.beep(784, 150);
    setTimeout(() => this.beep(880, 150), 160);
    setTimeout(() => this.beep(1047, 250), 320);
    this.vibrate([100, 50, 100, 50, 100, 50, 100, 50, 100]);
  }
}

const notifications = new NotificationManager();

export default function PEARApp() {
  const [screen, setScreen] = useState('launch');
  const [countdown, setCountdown] = useState(900);
  const [matchTime, setMatchTime] = useState(45);
  const [chatTime, setChatTime] = useState(120);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [votes, setVotes] = useState({});
  const [showIcebreakers, setShowIcebreakers] = useState(false);
  const [alertsTriggered, setAlertsTriggered] = useState({});
  const [formData, setFormData] = useState({
    eventCode: '',
    phone: '',
    otp: '',
    firstName: '',
    gender: '',
    status: 'active',
  });

  const ICEBREAKERS = [
    '🤔 What is a hill you\'re willing to die on?',
    '🎤 What\'s your go-to karaoke song?',
    '🍽️ Dream dinner guest (living or dead)?',
    '🤮 Weirdest thing you\'ve eaten & liked?',
    '🏠 Weekend vibe: stay in or go out?',
    '🎯 Hidden talent that surprises people?',
    '🎬 Most unpopular movie opinion?',
    '🤝 One person only for 24 hours?'
  ];

  const attendees = [
    { id: '1', name: 'Jordan', outfit: '❤️ Red Dress', emoji: '🔥' },
    { id: '2', name: 'Alex', outfit: '👕 Blue Shirt', emoji: '😎' },
    { id: '3', name: 'Sam', outfit: '🧥 Black Jacket', emoji: '✨' },
  ];

  useEffect(() => {
    if (screen === 'lobby' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (screen === 'lobby') {
      if (countdown === 900) {
        notifications.matchFound();
      } else if (countdown === 300 && !alertsTriggered.countdown5min) {
        notifications.warning();
        setAlertsTriggered(prev => ({ ...prev, countdown5min: true }));
      } else if (countdown === 60 && !alertsTriggered.countdown1min) {
        notifications.urgent();
        setAlertsTriggered(prev => ({ ...prev, countdown1min: true }));
      } else if (countdown <= 10 && countdown > 0 && !alertsTriggered.countdown10sec) {
        notifications.critical();
        setAlertsTriggered(prev => ({ ...prev, countdown10sec: true }));
      } else if (countdown === 0) {
        notifications.critical();
      }
    }
  }, [countdown, screen, alertsTriggered]);

  useEffect(() => {
    if (screen === 'hunt' && matchTime > 0) {
      const timer = setTimeout(() => setMatchTime(m => m - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (screen === 'hunt') {
      if (matchTime === 45) {
        notifications.matchFound();
      } else if (matchTime === 40 && !alertsTriggered.matchTime40sec) {
        notifications.warning();
        setAlertsTriggered(prev => ({ ...prev, matchTime40sec: true }));
      } else if (matchTime === 10 && !alertsTriggered.matchTime10sec) {
        notifications.urgent();
        setAlertsTriggered(prev => ({ ...prev, matchTime10sec: true }));
      } else if (matchTime === 0) {
        notifications.critical();
      }
    }
  }, [matchTime, screen, alertsTriggered]);

  useEffect(() => {
    if (screen === 'chat' && chatTime > 0) {
      const timer = setTimeout(() => setChatTime(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (screen === 'chat') {
      if (chatTime === 120) {
        notifications.matchFound();
      } else if (chatTime === 30 && !alertsTriggered.chatTime30sec) {
        notifications.warning();
        setAlertsTriggered(prev => ({ ...prev, chatTime30sec: true }));
      } else if (chatTime === 10 && !alertsTriggered.chatTime10sec) {
        notifications.urgent();
        setAlertsTriggered(prev => ({ ...prev, chatTime10sec: true }));
      } else if (chatTime <= 5 && chatTime > 0) {
        notifications.beep(800, 100);
      } else if (chatTime === 0) {
        notifications.critical();
      }
    }
  }, [chatTime, screen, alertsTriggered]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const countdownColor = countdown < 300 ? '#FF9B85' : countdown < 600 ? '#FFD97D' : '#A8D5BA';
  const urgency = matchTime < 10;

  const toggleVote = (id, type) => {
    setVotes(prev => ({ ...prev, [id]: prev[id] === type ? null : type }));
  };

  if (screen === 'launch') {
    return (
      <div style={styles.pageContainer}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
          @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
          * { box-sizing: border-box; font-family: 'Inter', sans-serif; }
          body { margin: 0; }
        `}</style>
        <div style={styles.heroSection}>
          <div style={styles.logoContainer}>
            <div style={{...styles.emoji, animation: 'float 3s ease-in-out infinite'}}>🍐</div>
            <h1 style={styles.mainLogo}>PEAR</h1>
            <p style={styles.tagline}>Find Your Perfect Pair</p>
          </div>
          <div style={styles.contentSection}>
            <button style={styles.primaryBtn} onClick={() => setScreen('signup')}>
              📱 Get Started
            </button>
            <input
              type="text"
              placeholder="Event code"
              value={formData.eventCode}
              onChange={(e) => setFormData({...formData, eventCode: e.target.value.toUpperCase()})}
              style={styles.input}
              maxLength="20"
            />
            <button style={styles.primaryBtn} onClick={() => setScreen('signup')}>
              ✨ Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'signup') {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.cardContainer}>
          <h2 style={styles.heading}>👋 Welcome to PEAR</h2>
          <input type="tel" placeholder="Phone number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} style={styles.input} />
          <button style={styles.primaryBtn} onClick={() => setScreen('otp')}>📨 Send Code</button>
          <button style={styles.secondaryBtn} onClick={() => setScreen('launch')}>← Back</button>
        </div>
      </div>
    );
  }

  if (screen === 'otp') {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.cardContainer}>
          <h2 style={styles.heading}>✅ Verify Code</h2>
          <input type="text" placeholder="123456" value={formData.otp} onChange={(e) => setFormData({...formData, otp: e.target.value.slice(0, 6)})} style={styles.input} maxLength="6" />
          <button style={styles.primaryBtn} onClick={() => setScreen('profile')}>✓ Verify</button>
          <button style={styles.secondaryBtn} onClick={() => setScreen('signup')}>← Back</button>
        </div>
      </div>
    );
  }

  if (screen === 'profile') {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.cardContainer}>
          <h2 style={styles.heading}>🎨 Your Profile</h2>
          <input type="text" placeholder="First name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} style={styles.input} maxLength="24" />
          <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} style={styles.input}>
            <option value="">Select Gender</option>
            <option value="Man">Man</option>
            <option value="Woman">Woman</option>
            <option value="Non-binary">Non-binary</option>
          </select>
          <button style={styles.primaryBtn} onClick={() => { setCountdown(900); setAlertsTriggered({}); setScreen('lobby'); }}>🎉 Find Your Pear!</button>
          <button style={styles.secondaryBtn} onClick={() => setScreen('otp')}>← Back</button>
        </div>
      </div>
    );
  }

  if (screen === 'lobby') {
    return (
      <div style={{...styles.pageContainer, background: 'linear-gradient(135deg, #FFF9F3 0%, #B5E7D8 100%)'}}>
        <div style={styles.content}>
          <div style={{textAlign: 'center', padding: '20px'}}>
            <h2 style={{fontSize: '32px', fontWeight: 700}}>🎉 You're In!</h2>
            <p style={{fontSize: '48px', fontWeight: 'bold', color: countdownColor, fontFamily: 'monospace'}}>{formatTime(countdown)}</p>
          </div>
          <button style={{...styles.primaryBtn, backgroundColor: '#FFD97D', color: '#2C2C2C'}} onClick={() => { setMatchTime(45); setAlertsTriggered({}); setScreen('hunt'); }}>
            ⏩ Skip & Start Match Now!
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'hunt') {
    return (
      <div style={{...styles.pageContainer, background: urgency ? 'linear-gradient(135deg, #FFE5D9 0%, #FFB3D9 100%)' : 'linear-gradient(135deg, #FFF9F3 0%, #FFD97D 100%)'}}>
        <div style={styles.content}>
          <h2 style={{fontSize: '32px', color: '#FF9B85', textAlign: 'center'}}>🔔 Find Your Pear!</h2>
          <div style={{fontSize: '80px', textAlign: 'center', margin: '40px 0'}}>📸</div>
          <p style={{fontSize: '48px', fontWeight: 'bold', color: urgency ? '#FF9B85' : '#A8D5BA', fontFamily: 'monospace', textAlign: 'center'}}>{String(matchTime).padStart(2, '0')}</p>
          <button style={styles.primaryBtn} onClick={() => { notifications.success(); setChatTime(120); setAlertsTriggered({}); setScreen('chat'); }}>🍐 Found Them!</button>
        </div>
      </div>
    );
  }

  if (screen === 'chat') {
    return (
      <div style={{...styles.pageContainer, background: 'linear-gradient(135deg, #B5E7D8 0%, #FFD97D 100%)'}}>
        <div style={styles.content}>
          <h3 style={{fontSize: '20px', fontWeight: '600', textAlign: 'center'}}>💬 Chat with Jordan</h3>
          <p style={{fontSize: '24px', fontWeight: 'bold', color: '#FF9B85', textAlign: 'center'}}>{formatTime(chatTime)}</p>
          <textarea placeholder="Share your thoughts... 💭" style={{...styles.input, minHeight: '120px'}} />
          <button style={styles.secondaryBtn} onClick={() => setShowIcebreakers(!showIcebreakers)}>
            {showIcebreakers ? '❌ Hide Questions' : '💡 Show Questions'}
          </button>
          {showIcebreakers && (
            <>
              <div style={{backgroundColor: 'rgba(255,255,255,0.9)', padding: '20px', borderRadius: '12px', marginTop: '10px'}}>
                <p style={{fontSize: '12px', color: '#A8D5BA', margin: 0}}>Question {currentQuestion + 1}/8</p>
                <p style={{fontSize: '16px', fontWeight: '600', color: '#2C2C2C', margin: '8px 0 0 0'}}>{ICEBREAKERS[currentQuestion]}</p>
              </div>
              <button style={{...styles.primaryBtn, marginTop: '10px'}} onClick={() => setCurrentQuestion((currentQuestion + 1) % ICEBREAKERS.length)}>
                → Next Question
              </button>
            </>
          )}
          {chatTime < 2 && (
            <button style={{...styles.secondaryBtn, marginTop: '10px'}} onClick={() => { notifications.success(); setScreen('voting'); }}>
              Continue to Voting 🎉
            </button>
          )}
        </div>
      </div>
    );
  }

  if (screen === 'voting') {
    return (
      <div style={{...styles.pageContainer, background: 'linear-gradient(135deg, #FFF9F3 0%, #B5E7D8 100%)'}}>
        <div style={styles.content}>
          <h2 style={{fontSize: '32px', fontWeight: '700', textAlign: 'center'}}>How'd It Go? 🍐</h2>
          {attendees.map(person => (
            <div key={person.id} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.9)', padding: '14px', borderRadius: '12px', marginBottom: '10px'}}>
              <div>
                <p style={{fontSize: '16px', fontWeight: '600', margin: 0}}>{person.emoji} {person.name}</p>
              </div>
              <div style={{display: 'flex', gap: '8px'}}>
                <button onClick={() => { toggleVote(person.id, 'match'); notifications.matchFound(); }} style={{width: '44px', height: '44px', fontSize: '20px', border: 'none', borderRadius: '10px', backgroundColor: votes[person.id] === 'match' ? '#A8D5BA' : '#F0F0F0', cursor: 'pointer'}}>🍐</button>
                <button onClick={() => toggleVote(person.id, 'buddy')} style={{width: '44px', height: '44px', fontSize: '20px', border: 'none', borderRadius: '10px', backgroundColor: votes[person.id] === 'buddy' ? '#A8D5BA' : '#F0F0F0', cursor: 'pointer'}}>🤝</button>
                <button onClick={() => toggleVote(person.id, 'pass')} style={{width: '44px', height: '44px', fontSize: '20px', border: 'none', borderRadius: '10px', backgroundColor: votes[person.id] === 'pass' ? '#A8D5BA' : '#F0F0F0', cursor: 'pointer'}}>🙅</button>
              </div>
            </div>
          ))}
          <button style={styles.primaryBtn} onClick={() => { notifications.mutualMatch(); setScreen('complete'); }}>💚 Submit Votes</button>
        </div>
      </div>
    );
  }

  if (screen === 'complete') {
    return (
      <div style={{...styles.pageContainer, background: 'linear-gradient(135deg, #A8D5BA 0%, #FFD97D 100%)'}}>
        <div style={styles.content}>
          <div style={{textAlign: 'center'}}>
            <p style={{fontSize: '120px', margin: 0}}>🍐</p>
            <h2 style={{fontSize: '40px', fontWeight: '700', color: '#2C2C2C'}}>Pear-fect!</h2>
          </div>
          <button style={styles.primaryBtn} onClick={() => { setCountdown(900); setAlertsTriggered({}); setScreen('launch'); }}>
            🎉 Find More Pears
          </button>
        </div>
      </div>
    );
  }

  return null;
}

const styles = {
  pageContainer: {
    width: '100%',
    maxWidth: '500px',
    margin: '0 auto',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    color: '#2C2C2C',
    background: 'linear-gradient(135deg, #FFF9F3 0%, #B5E7D8 100%)',
  },
  heroSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '40px 20px',
  },
  logoContainer: {
    textAlign: 'center',
    marginTop: '40px',
  },
  emoji: {
    fontSize: '80px',
    display: 'block',
    marginBottom: '20px',
  },
  mainLogo: {
    fontSize: '56px',
    fontWeight: 700,
    color: '#A8D5BA',
    margin: '0 0 10px 0',
  },
  tagline: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#5B8B8E',
    margin: 0,
  },
  contentSection: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  cardContainer: {
    margin: '40px 20px',
    padding: '30px 24px',
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,8%)',
  },
  content: {
    flex: 1,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  heading: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#2C2C2C',
    margin: '0 0 20px 0',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '16px',
    border: '2px solid #B5E7D8',
    borderRadius: '12px',
    backgroundColor: '#FFF9F3',
  },
  primaryBtn: {
    width: '100%',
    height: '52px',
    backgroundColor: '#A8D5BA',
    color: '#FFFFFF',
    fontSize: '16px',
    fontWeight: 700,
    border: 'none',
    borderRadius: '14px',
    cursor: 'pointer',
  },
  secondaryBtn: {
    width: '100%',
    height: '52px',
    backgroundColor: 'transparent',
    color: '#A8D5BA',
    fontSize: '16px',
    fontWeight: 600,
    border: '2px solid #B5E7D8',
    borderRadius: '14px',
    cursor: 'pointer',
  },
};

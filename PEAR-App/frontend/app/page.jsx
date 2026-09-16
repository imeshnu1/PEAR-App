'use client'
import React, { useState, useEffect } from 'react';

/**
 * 🍐 PEAR Notification System - Sound & Vibration Effects
 * Plays sounds and vibrations at key moments
 */
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

  // Match found - happy chime
  matchFound() {
    this.beep(523, 150);
    setTimeout(() => this.beep(659, 150), 160);
    this.vibrate([100, 50, 100, 50, 100]);
  }

  // Warning - medium pitch
  warning() {
    this.beep(600, 300);
    this.vibrate([150, 100, 150]);
  }

  // Urgent - higher pitch
  urgent() {
    this.beep(800, 250);
    this.vibrate([200, 50, 200, 50, 200]);
  }

  // Critical - loud repeating
  critical() {
    this.beep(1000, 200);
    setTimeout(() => this.beep(1000, 200), 250);
    setTimeout(() => this.beep(1000, 200), 500);
    this.vibrate([300, 100, 300, 100, 300]);
  }

  // Success - ascending notes
  success() {
    this.beep(523, 150);
    setTimeout(() => this.beep(659, 150), 160);
    setTimeout(() => this.beep(784, 200), 320);
    this.vibrate([100, 50, 100, 50, 100, 50, 100, 50, 100]);
  }

  // Mutual match - celebration
  mutualMatch() {
    this.beep(784, 150);
    setTimeout(() => this.beep(880, 150), 160);
    setTimeout(() => this.beep(1047, 250), 320);
    this.vibrate([100, 50, 100, 50, 100, 50, 100, 50, 100]);
  }

  stopVibration() {
    if (navigator.vibrate) navigator.vibrate(0);
  }
}

const notifications = new NotificationManager();

export default function PEARBeautiful() {
  const [screen, setScreen] = useState('launch');
  const [countdown, setCountdown] = useState(900);
  const [matchTime, setMatchTime] = useState(45);
  const [chatTime, setChatTime] = useState(120);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [votes, setVotes] = useState({});
  const [showVoucher, setShowVoucher] = useState(false);
  const [showIcebreakers, setShowIcebreakers] = useState(false);
  const [formData, setFormData] = useState({
    eventCode: '',
    phone: '',
    otp: '',
    firstName: '',
    gender: '',
    outfit: '',
    status: 'active',
  });

  // Track alert states to avoid duplicate notifications
  const [alertsTriggered, setAlertsTriggered] = useState({
    countdown5min: false,
    countdown1min: false,
    countdown10sec: false,
    matchTime40sec: false,
    matchTime10sec: false,
    chatTime30sec: false,
    chatTime10sec: false,
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

  // ==================== COUNTDOWN TIMERS WITH ESCALATING ALERTS ====================

  useEffect(() => {
    if (screen === 'lobby' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
    
    // Countdown alerts with escalation
    if (screen === 'lobby') {
      if (countdown === 900) {
        // Event starts - soft notification
        notifications.matchFound();
      } else if (countdown === 300 && !alertsTriggered.countdown5min) {
        // 5 minutes remaining - warning
        notifications.warning();
        setAlertsTriggered(prev => ({ ...prev, countdown5min: true }));
      } else if (countdown === 60 && !alertsTriggered.countdown1min) {
        // 1 minute remaining - urgent (every 10 sec in final minute)
        notifications.urgent();
        setAlertsTriggered(prev => ({ ...prev, countdown1min: true }));
      } else if (countdown <= 10 && countdown > 0 && !alertsTriggered.countdown10sec) {
        // Final 10 seconds - CRITICAL escalating alerts
        notifications.critical();
        setAlertsTriggered(prev => ({ ...prev, countdown10sec: true }));
      } else if (countdown === 0) {
        // Time's up!
        notifications.critical();
      }
    }
  }, [countdown, screen, alertsTriggered]);

  // ==================== MATCH HUNT TIMER WITH ALERTS ====================

  useEffect(() => {
    if (screen === 'hunt' && matchTime > 0) {
      const timer = setTimeout(() => setMatchTime(m => m - 1), 1000);
      return () => clearTimeout(timer);
    }
    
    // Hunt alerts
    if (screen === 'hunt') {
      if (matchTime === 45) {
        // Match found - celebration!
        notifications.matchFound();
      } else if (matchTime === 40 && !alertsTriggered.matchTime40sec) {
        // Warning at 40 seconds
        notifications.warning();
        setAlertsTriggered(prev => ({ ...prev, matchTime40sec: true }));
      } else if (matchTime === 10 && !alertsTriggered.matchTime10sec) {
        // Final 10 seconds - urgent
        notifications.urgent();
        setAlertsTriggered(prev => ({ ...prev, matchTime10sec: true }));
      } else if (matchTime === 0) {
        // Time's up - auto transition with alert
        notifications.critical();
      }
    }
  }, [matchTime, screen, alertsTriggered]);

  // ==================== CHAT TIMER WITH ALERTS ====================

  useEffect(() => {
    if (screen === 'chat' && chatTime > 0) {
      const timer = setTimeout(() => setChatTime(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
    
    // Chat alerts
    if (screen === 'chat') {
      if (chatTime === 120) {
        // Chat starts - transition sound
        notifications.matchFound();
      } else if (chatTime === 30 && !alertsTriggered.chatTime30sec) {
        // 30 seconds remaining - warning
        notifications.warning();
        setAlertsTriggered(prev => ({ ...prev, chatTime30sec: true }));
      } else if (chatTime === 10 && !alertsTriggered.chatTime10sec) {
        // Final 10 seconds - urgent repeating
        notifications.urgent();
        setAlertsTriggered(prev => ({ ...prev, chatTime10sec: true }));
      } else if (chatTime <= 5 && chatTime > 0) {
        // Countdown in final 5 seconds - beep each second
        notifications.beep(800, 100);
      } else if (chatTime === 0) {
        // Time's up!
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

  // ==================== LAUNCH SCREEN ====================
  if (screen === 'launch') {
    return (
      <div style={styles.pageContainer}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
          @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
          * { box-sizing: border-box; font-family: 'Inter', sans-serif; }
          body { margin: 0; background: linear-gradient(135deg, #FFF9F3 0%, #B5E7D8 100%); }
        `}</style>
        
        <div style={styles.heroSection}>
          <div style={styles.logoContainer}>
            <div style={{...styles.emoji, animation: 'float 3s ease-in-out infinite'}}>🍐</div>
            <h1 style={styles.mainLogo}>PEAR</h1>
            <p style={styles.tagline}>Find Your Perfect Pair</p>
          </div>

          <div style={styles.heroDescription}>
            <p style={styles.heroText}>✨ A whimsical speed dating adventure</p>
            <p style={styles.heroText}>🔔 Real-time notifications & alerts</p>
            <p style={styles.heroText}>🎉 Find your pear tonight</p>
          </div>

          <div style={styles.contentSection}>
            <button style={styles.primaryBtn} onClick={() => setScreen('signup')}>
              📱 Get Started
            </button>
            
            <div style={styles.divider}>try demo event</div>
            
            <input
              type="text"
              placeholder="Event code"
              value={formData.eventCode}
              onChange={(e) => setFormData({...formData, eventCode: e.target.value.toUpperCase()})}
              style={styles.input}
              maxLength="20"
            />
            
            <button 
              style={{...styles.primaryBtn, opacity: formData.eventCode ? 1 : 0.6}}
              onClick={() => setScreen('signup')}
              disabled={!formData.eventCode}
            >
              ✨ Continue
            </button>

            <p style={{textAlign: 'center', fontSize: '12px', color: '#A8D5BA', marginTop: '20px'}}>
              🔔 Tip: Your phone will buzz & make sounds during the event!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==================== SIGNUP ====================
  if (screen === 'signup') {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.cardContainer}>
          <div style={styles.cardHeader}>
            <h2 style={styles.heading}>👋 Welcome to PEAR</h2>
            <p style={styles.subheading}>Let's find your perfect match</p>
          </div>
          
          <input
            type="tel"
            placeholder="Your phone number"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            style={styles.input}
          />
          
          <button 
            style={{...styles.primaryBtn, opacity: formData.phone.length >= 5 ? 1 : 0.6}}
            onClick={() => setScreen('otp')}
            disabled={formData.phone.length < 5}
          >
            📨 Send Code
          </button>
          
          <button style={styles.secondaryBtn} onClick={() => setScreen('launch')}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ==================== OTP ====================
  if (screen === 'otp') {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.cardContainer}>
          <div style={styles.cardHeader}>
            <h2 style={styles.heading}>✅ Verify Code</h2>
            <p style={styles.subheading}>Enter the 6-digit code</p>
          </div>
          
          <input
            type="text"
            placeholder="123456"
            value={formData.otp}
            onChange={(e) => setFormData({...formData, otp: e.target.value.slice(0, 6)})}
            style={{...styles.input, fontSize: '24px', letterSpacing: '8px', textAlign: 'center', fontWeight: 'bold'}}
            maxLength="6"
          />
          
          <button 
            style={{...styles.primaryBtn, opacity: formData.otp.length === 6 ? 1 : 0.6}}
            onClick={() => setScreen('profile')}
            disabled={formData.otp.length < 6}
          >
            ✓ Verify
          </button>
          
          <button style={styles.secondaryBtn} onClick={() => setScreen('signup')}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ==================== PROFILE ====================
  if (screen === 'profile') {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.cardContainer}>
          <div style={styles.cardHeader}>
            <h2 style={styles.heading}>🎨 Your Profile</h2>
            <p style={styles.subheading}>Tell us about yourself</p>
          </div>
          
          <input
            type="text"
            placeholder="Your first name"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            style={styles.input}
            maxLength="24"
          />
          
          <select 
            value={formData.gender}
            onChange={(e) => setFormData({...formData, gender: e.target.value})}
            style={styles.input}
          >
            <option value="">👤 Select Gender</option>
            <option value="Man">👨‍🦱 Man</option>
            <option value="Woman">👩‍🦰 Woman</option>
            <option value="Non-binary">✨ Non-binary</option>
          </select>
          
          <button 
            style={{...styles.primaryBtn, opacity: formData.firstName && formData.gender ? 1 : 0.6}}
            onClick={() => { setCountdown(900); setAlertsTriggered({}); setScreen('lobby'); }}
            disabled={!formData.firstName || !formData.gender}
          >
            🎉 Find Your Pear!
          </button>
          
          <button style={styles.secondaryBtn} onClick={() => setScreen('otp')}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ==================== LOBBY ====================
  if (screen === 'lobby') {
    const countdownPercent = (countdown / 900) * 100;
    return (
      <div style={{...styles.pageContainer, background: 'linear-gradient(135deg, #FFF9F3 0%, #B5E7D8 100%)'}}>
        <div style={styles.content}>
          <div style={styles.welcomeCard}>
            <h2 style={{...styles.heading, fontSize: '36px'}}>🎉 You're In!</h2>
            <p style={{...styles.subheading, fontSize: '16px'}}>12 amazing people waiting to meet you</p>
          </div>

          <div style={styles.countdownCard}>
            <p style={{fontSize: '14px', color: '#A8D5BA', margin: '0 0 10px 0'}}>⏱️ Event starting in:</p>
            <p style={{fontSize: '48px', fontWeight: 'bold', margin: 0, fontFamily: 'monospace', color: countdownColor}}>
              {formatTime(countdown)}
            </p>
            {countdown < 300 && (
              <p style={{fontSize: '12px', color: '#FF9B85', margin: '8px 0 0 0', animation: 'pulse 1s infinite'}}>
                🔔 Notifications active
              </p>
            )}
          </div>

          <div style={styles.statusSection}>
            <p style={styles.label}>🎭 Your Status</p>
            <div style={styles.statusGrid}>
              {[
                { key: 'active', label: '✓ Active', emoji: '🟢' },
                { key: 'resting', label: '☕ Resting', emoji: '🟡' },
                { key: 'leaving', label: '🚪 Leaving', emoji: '🔴' }
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => setFormData({...formData, status: s.key})}
                  style={{
                    ...styles.statusBtn,
                    backgroundColor: formData.status === s.key ? '#A8D5BA' : '#F0F0F0',
                    color: formData.status === s.key ? '#fff' : '#2C2C2C',
                    transform: formData.status === s.key ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          <button 
            style={{...styles.primaryBtn, backgroundColor: '#FFD97D', color: '#2C2C2C', fontWeight: '700'}} 
            onClick={() => { setMatchTime(45); setAlertsTriggered({}); setScreen('hunt'); }}
          >
            ⏩ Skip & Start Match Now!
          </button>

          {countdown < 5 && (
            <button style={styles.primaryBtn} onClick={() => { setMatchTime(45); setAlertsTriggered({}); setScreen('hunt'); }}>
              🔔 Matches Are Here!
            </button>
          )}

          <p style={{textAlign: 'center', fontSize: '12px', color: '#A8D5BA', marginTop: '15px'}}>
            🔊 You'll hear alerts at: 5 min, 1 min, and when time ends
          </p>
        </div>
      </div>
    );
  }

  // ==================== HUNT ====================
  if (screen === 'hunt') {
    return (
      <div style={{...styles.pageContainer, background: urgency ? 'linear-gradient(135deg, #FFE5D9 0%, #FFB3D9 100%)' : 'linear-gradient(135deg, #FFF9F3 0%, #FFD97D 100%)'}}>
        <div style={styles.content}>
          <div style={{textAlign: 'center', marginBottom: '30px'}}>
            <h2 style={{...styles.heading, fontSize: '32px', animation: urgency ? 'pulse 1s infinite' : 'none', color: '#FF9B85'}}>
              🔔 BUZZ! Find Your Pear
            </h2>
            <p style={{color: '#5B8B8E', marginTop: '10px'}}>Blue shirt & red glasses</p>
          </div>

          <div style={styles.photoContainer}>
            <div style={styles.photoCircle}>📸</div>
            <div style={styles.outfitBadge}>👗 Blue Shirt</div>
          </div>

          <div style={{...styles.countdownCard, backgroundColor: 'rgba(255, 255, 255, 0.8)'}}>
            <p style={{fontSize: '14px', color: '#A8D5BA', margin: '0 0 10px 0'}}>🔊 Find them in:</p>
            <p style={{fontSize: '56px', fontWeight: 'bold', margin: 0, fontFamily: 'monospace', color: urgency ? '#FF9B85' : '#A8D5BA'}}>
              {String(matchTime).padStart(2, '0')}
            </p>
            {matchTime < 10 && (
              <p style={{fontSize: '12px', color: '#FF9B85', marginTop: '8px'}}>⚠️ Alerts active!</p>
            )}
          </div>

          <button style={styles.primaryBtn} onClick={() => { notifications.success(); setChatTime(120); setAlertsTriggered({}); setScreen('chat'); }}>
            🍐 Found Them! PEARD!
          </button>

          {matchTime < 5 && (
            <button 
              style={{...styles.primaryBtn, backgroundColor: '#FF9B85', marginTop: '10px'}}
              onClick={() => setScreen('voucher')}
            >
              💔 Can't Find My Pear
            </button>
          )}
        </div>
      </div>
    );
  }

  // ==================== VOUCHER ====================
  if (screen === 'voucher') {
    return (
      <div style={{...styles.pageContainer, background: 'linear-gradient(135deg, #FFE5D9 0%, #FFD97D 100%)'}}>
        <div style={styles.content}>
          <div style={{textAlign: 'center', marginBottom: '30px'}}>
            <p style={{fontSize: '80px', margin: 0}}>💔</p>
            <h2 style={{...styles.heading, color: '#FF9B85'}}>Aww, We're Sorry!</h2>
          </div>

          <div style={{...styles.card, border: '3px solid #A8D5BA', backgroundColor: '#FFFFFF', padding: '30px'}}>
            <p style={{fontSize: '28px', fontWeight: 'bold', color: '#A8D5BA', margin: '0 0 20px 0'}}>
              💝 $5 Off Your Next Drink
            </p>
            <div style={{backgroundColor: '#FFF9F3', padding: '20px', borderRadius: '12px', textAlign: 'center', marginBottom: '20px'}}>
              <p style={{fontSize: '12px', color: '#A8D5BA', margin: 0}}>Code:</p>
              <code style={{fontSize: '20px', fontWeight: 'bold', color: '#2C2C2C', fontFamily: 'monospace'}}>PEAR5OFF</code>
            </div>
          </div>

          <button style={styles.primaryBtn} onClick={() => { setCountdown(60); setAlertsTriggered({}); setScreen('lobby'); }}>
            ← Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // ==================== CHAT ====================
  if (screen === 'chat') {
    return (
      <div style={{...styles.pageContainer, background: 'linear-gradient(135deg, #B5E7D8 0%, #FFD97D 100%)'}}>
        <div style={styles.content}>
          <div style={styles.chatHeader}>
            <h3 style={{fontSize: '20px', fontWeight: '600', color: '#2C2C2C', margin: 0}}>💬 Chat with Jordan</h3>
            <p style={{fontSize: '24px', fontFamily: 'monospace', fontWeight: 'bold', color: '#FF9B85', margin: '10px 0 0 0'}}>
              {formatTime(chatTime)}
            </p>
            {chatTime < 30 && (
              <p style={{fontSize: '12px', color: '#FF9B85', margin: '8px 0 0 0'}}>🔊 Alerts active</p>
            )}
          </div>

          <textarea
            placeholder="Share your thoughts... 💭"
            style={{...styles.input, minHeight: '120px', resize: 'vertical'}}
          />

          <button 
            style={{...styles.secondaryBtn}} 
            onClick={() => setShowIcebreakers(!showIcebreakers)}
          >
            {showIcebreakers ? '❌ Hide Icebreaker Questions' : '💡 Show Icebreaker Questions'}
          </button>

          {showIcebreakers && (
            <>
              <div style={styles.icebreakerCard}>
                <p style={{fontSize: '12px', color: '#A8D5BA', margin: '0 0 10px 0'}}>Question {currentQuestion + 1}/8</p>
                <p style={{fontSize: '18px', fontWeight: '600', color: '#2C2C2C', margin: 0}}>
                  {ICEBREAKERS[currentQuestion]}
                </p>
              </div>

              <button style={styles.primaryBtn} onClick={() => setCurrentQuestion((currentQuestion + 1) % ICEBREAKERS.length)}>
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

  // ==================== VOTING ====================
  if (screen === 'voting') {
    return (
      <div style={{...styles.pageContainer, background: 'linear-gradient(135deg, #FFF9F3 0%, #B5E7D8 100%)'}}>
        <div style={styles.content}>
          <div style={{textAlign: 'center', marginBottom: '30px'}}>
            <h2 style={{...styles.heading, fontSize: '32px'}}>How'd It Go? 🍐</h2>
            <p style={styles.subheading}>Vote on everyone you met tonight</p>
          </div>

          <div style={styles.attendeesList}>
            {attendees.map(person => (
              <div key={person.id} style={styles.attendeeCard}>
                <div style={{flex: 1}}>
                  <p style={{fontSize: '18px', fontWeight: '600', color: '#2C2C2C', margin: 0}}>
                    {person.emoji} {person.name}
                  </p>
                  <p style={{fontSize: '12px', color: '#A8D5BA', margin: '4px 0 0 0'}}>{person.outfit}</p>
                </div>
                <div style={styles.reactionButtons}>
                  {[
                    { type: 'match', emoji: '🍐', label: 'Pear Match' },
                    { type: 'buddy', emoji: '🤝', label: 'Buddy Pear' },
                    { type: 'pass', emoji: '🙅', label: 'Pass' }
                  ].map(reaction => (
                    <button
                      key={reaction.type}
                      onClick={() => {
                        toggleVote(person.id, reaction.type);
                        if (reaction.type === 'match' && !votes[person.id]) {
                          notifications.matchFound();
                        }
                      }}
                      title={reaction.label}
                      style={{
                        ...styles.reactionBtn,
                        backgroundColor: votes[person.id] === reaction.type ? '#A8D5BA' : '#F0F0F0',
                        transform: votes[person.id] === reaction.type ? 'scale(1.2)' : 'scale(1)',
                        fontSize: '24px'
                      }}
                    >
                      {reaction.emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button style={styles.primaryBtn} onClick={() => { notifications.mutualMatch(); setScreen('complete'); }}>
            💚 Submit My Votes
          </button>
        </div>
      </div>
    );
  }

  // ==================== COMPLETE ====================
  if (screen === 'complete') {
    return (
      <div style={{...styles.pageContainer, background: 'linear-gradient(135deg, #A8D5BA 0%, #FFD97D 100%)'}}>
        <div style={styles.content}>
          <div style={{textAlign: 'center'}}>
            <p style={{fontSize: '120px', margin: 0}}>🍐</p>
            <h2 style={{...styles.heading, fontSize: '40px', color: '#2C2C2C'}}>Pear-fect Night!</h2>
            <p style={{fontSize: '16px', color: '#5B8B8E', marginTop: '10px'}}>You met 3 amazing pears 💕</p>
          </div>

          <div style={styles.statsCard}>
            <div style={styles.statItem}>
              <p style={{fontSize: '32px', margin: 0}}>✨</p>
              <p style={{fontSize: '14px', fontWeight: '600', margin: '8px 0 0 0'}}>3 Matches</p>
            </div>
            <div style={styles.statItem}>
              <p style={{fontSize: '32px', margin: 0}}>💕</p>
              <p style={{fontSize: '14px', fontWeight: '600', margin: '8px 0 0 0'}}>2 Connections</p>
            </div>
            <div style={styles.statItem}>
              <p style={{fontSize: '32px', margin: 0}}>🎉</p>
              <p style={{fontSize: '14px', fontWeight: '600', margin: '8px 0 0 0'}}>1 Mutual Match</p>
            </div>
          </div>

          <div style={styles.card}>
            <p style={{fontSize: '14px', color: '#2C2C2C', margin: '0 0 8px 0'}}>🔔 Notifications You Received:</p>
            <ul style={{fontSize: '12px', color: '#A8D5BA', margin: 0, paddingLeft: '20px', lineHeight: '1.6'}}>
              <li>✅ Match found buzz & chime</li>
              <li>✅ Warning at 5 minutes</li>
              <li>✅ Urgent alerts at 1 minute</li>
              <li>✅ Critical alarm when time ended</li>
              <li>✅ Chat alerts throughout</li>
            </ul>
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

// ==================== STYLES ====================

const styles = {
  pageContainer: {
    width: '100%',
    maxWidth: '500px',
    margin: '0 auto',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    color: '#2C2C2C',
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
    letterSpacing: '-2px',
  },
  tagline: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#5B8B8E',
    margin: 0,
  },
  heroDescription: {
    textAlign: 'center',
    padding: '20px',
  },
  heroText: {
    fontSize: '14px',
    color: '#5B8B8E',
    margin: '8px 0',
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
  cardHeader: {
    textAlign: 'center',
    marginBottom: '30px',
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
    margin: 0,
  },
  subheading: {
    fontSize: '14px',
    color: '#A8D5BA',
    margin: '8px 0 0 0',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#2C2C2C',
    margin: 0,
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '16px',
    border: '2px solid #B5E7D8',
    borderRadius: '12px',
    backgroundColor: '#FFF9F3',
    transition: 'all 0.3s',
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
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(168, 213, 186, 0.3)',
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
    transition: 'all 0.3s',
  },
  divider: {
    textAlign: 'center',
    color: '#B5E7D8',
    fontWeight: 600,
    fontSize: '12px',
    letterSpacing: '1px',
  },
  welcomeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '24px',
    borderRadius: '16px',
    textAlign: 'center',
  },
  countdownCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '30px',
    borderRadius: '16px',
    textAlign: 'center',
  },
  statusSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '10px',
  },
  statusBtn: {
    padding: '12px',
    fontSize: '13px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  photoContainer: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    marginBottom: '20px',
  },
  photoCircle: {
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '80px',
    boxShadow: '0 8px 24px rgba(0,0,0,15%)',
  },
  outfitBadge: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    backgroundColor: '#FFFFFF',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 600,
    boxShadow: '0 4px 12px rgba(0,0,0,10%)',
  },
  chatHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '20px',
    borderRadius: '16px',
    textAlign: 'center',
  },
  icebreakerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    border: '2px solid #B5E7D8',
    borderRadius: '14px',
    padding: '20px',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '14px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,4%)',
  },
  attendeesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  attendeeCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '14px',
    borderRadius: '12px',
    gap: '12px',
  },
  reactionButtons: {
    display: 'flex',
    gap: '8px',
  },
  reactionBtn: {
    width: '44px',
    height: '44px',
    fontSize: '20px',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  statsCard: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '12px',
    marginBottom: '20px',
  },
  statItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
  },
};

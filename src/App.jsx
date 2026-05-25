import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { 
  Bell, Eye, EyeOff, Search, SlidersHorizontal, QrCode, 
  Scan, ArrowLeft, ChevronRight, Check, X, Plus, 
  Gift, User, ArrowUp, RefreshCw, LogOut, Info,
  ChevronDown, BarChart2
} from 'lucide-react';
import nairaIllustration from './assets/naira_spray_illustration.png';

// Mock Data
const LOGGED_IN_USER = {
  name: "Elo",
  greeting: "How far, Elo?",
  subtext: "Who's celebrating today?",
  balance: 50350.00
};

const RECIPIENT = {
  name: "Temi Nwosu",
  tag: "@teminwosu",
  location: "Lagos, NG",
  event: "30th Birthday Celebration",
  venue: "Eko Hotel, Victoria Island",
  sessionCloses: "11:59 PM tonight",
  sprayedSoFar: 2420439,
  activeSprayers: 4,
  status: "Live"
};

const RECENT_TRANSACTIONS = [
  { id: 1, name: "Adaeze Obi",   date: "Sep 20, 2025", amount: 500,  balance: 26042.60, status: "Pending" },
  { id: 2, name: "Adaeze Obi",   date: "Sep 20, 2025", amount: 500,  balance: 26042.60, status: "Completed" },
  { id: 3, name: "Temi Nwosu",   date: "Sep 19, 2025", amount: 1000, balance: 25542.60, status: "Completed" },
  { id: 4, name: "Kunle Adeola", date: "Sep 19, 2025", amount: 200,  balance: 24542.60, status: "Completed" },
  { id: 5, name: "Bimpe Ige",    date: "Sep 18, 2025", amount: 500,  balance: 24342.60, status: "Completed" },
  { id: 6, name: "Temi Ade",     date: "Sep 18, 2025", amount: 500,  balance: 23842.60, status: "Pending" },
];

const CONTACTS = [
  { id: 'temi', name: "Temi", tag: "@teminwosu", avatar: "TN", live: true },
  { id: 'adaeze', name: "Adaeze", tag: "@adaezeobi", avatar: "AO", live: false },
  { id: 'kunle', name: "Kunle", tag: "@kunleadeola", avatar: "KA", live: false },
  { id: 'bimpe', name: "Bimpe", tag: "@bimpeige", avatar: "BI", live: false },
  { id: 'temi_a', name: "Temi A.", tag: "@temiade", avatar: "TA", live: false }
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home' | 'spray_someone' | 'ready_to_spray' | 'spray_screen'
  const [walletBalance, setWalletBalance] = useState(LOGGED_IN_USER.balance);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  
  // Navigation stack to support beautiful back transitions
  const [screenStack, setScreenStack] = useState(['home']);

  // Screen 2 (Spray Someone) state
  const [searchTag, setSearchTag] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // Screen 3 (Ready to Spray) state
  const [sprayAmount, setSprayAmount] = useState(0);

  // Screen 4 (Pick Your Note) Bottom Sheet state
  const [showNoteSheet, setShowNoteSheet] = useState(false);
  const [selectedDenom, setSelectedDenom] = useState(500); // 200 | 500 | 1000

  // Screen 5 (Spray Screen) state
  const [remainingSprayAmount, setRemainingSprayAmount] = useState(0);
  const [initialSprayAmount, setInitialSprayAmount] = useState(0);
  const [sprayedNotesCount, setSprayedNotesCount] = useState(0);
  const [flyingNotes, setFlyingNotes] = useState([]);
  const [showSessionDetailsSheet, setShowSessionDetailsSheet] = useState(false);
  const [isNoteAnimating, setIsNoteAnimating] = useState(false);
  
  // Custom interactive notification
  const [toastMessage, setToastMessage] = useState(null);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const navigateTo = (screenName) => {
    setScreenStack(prev => [...prev, screenName]);
    setCurrentScreen(screenName);
  };

  const navigateBack = () => {
    if (screenStack.length > 1) {
      const newStack = [...screenStack];
      newStack.pop();
      const prevScreen = newStack[newStack.length - 1];
      setScreenStack(newStack);
      setCurrentScreen(prevScreen);
    }
  };

  // Autocomplete filtering for Screen 2
  const filteredContacts = CONTACTS.filter(contact => 
    contact.name.toLowerCase().includes(searchTag.toLowerCase()) || 
    contact.tag.toLowerCase().includes(searchTag.toLowerCase())
  );

  // Quick chips for Screen 3
  const handleQuickAmount = (amount) => {
    setSprayAmount(amount);
  };

  // Custom Numpad input
  const handleNumpadPress = (val) => {
    if (val === 'Done') {
      if (sprayAmount > 0) {
        if (sprayAmount > walletBalance) {
          triggerToast("Insufficient wallet balance!");
          return;
        }
        setShowNoteSheet(true);
      }
      return;
    }
    
    if (val === 'C' || val === 'back') {
      setSprayAmount(prev => {
        const str = prev.toString();
        if (str.length <= 1) return 0;
        return parseInt(str.slice(0, -1));
      });
      return;
    }

    setSprayAmount(prev => {
      const currentStr = prev === 0 ? "" : prev.toString();
      const newStr = currentStr + val;
      const parsed = parseInt(newStr);
      return isNaN(parsed) ? prev : parsed;
    });
  };

  // Confirm and start spraying from Screen 4
  const startSprayingSession = () => {
    setRemainingSprayAmount(sprayAmount);
    setInitialSprayAmount(sprayAmount);
    setSprayedNotesCount(0);
    setShowNoteSheet(false);
    navigateTo('spray_screen');
  };

  // Swiping left/right to change note denomination on Screen 5
  const changeDenom = (direction) => {
    const denoms = [200, 500, 1000];
    const currentIndex = denoms.indexOf(selectedDenom);
    let nextIndex = currentIndex;
    
    if (direction === 'left') {
      nextIndex = (currentIndex + 1) % denoms.length;
    } else {
      nextIndex = (currentIndex - 1 + denoms.length) % denoms.length;
    }
    setSelectedDenom(denoms[nextIndex]);
    triggerToast(`Switched to ₦${denoms[nextIndex]} notes!`);
  };

  // Swiping UP on note / tapping note to spray
  const handleSprayNote = () => {
    if (remainingSprayAmount <= 0) {
      triggerToast("You've finished spraying your session amount!");
      return;
    }

    const cost = selectedDenom;
    if (remainingSprayAmount < cost) {
      triggerToast(`Remaining amount is less than ₦${cost}! Switch denomination or top up.`);
      return;
    }

    // Deduct balance and wallet balance
    setRemainingSprayAmount(prev => Math.max(0, prev - cost));
    setWalletBalance(prev => Math.max(0, prev - cost));
    setSprayedNotesCount(prev => prev + 1);

    // Launch flying note animation
    const id = Date.now() + Math.random();
    const newNote = {
      id,
      denom: selectedDenom,
      angle: Math.random() * 20 - 10, // -10 to +10 degrees
      scale: Math.random() * 0.2 + 0.9,
      drift: Math.random() * 100 - 50 // horizontal drift
    };
    setFlyingNotes(prev => [...prev, newNote]);

    // Clean up flying note after animation finishes (750ms)
    setTimeout(() => {
      setFlyingNotes(prev => prev.filter(n => n.id !== id));
    }, 750);
  };

  // Calculate note colors/styles
  const getNoteTheme = (denom) => {
    switch(denom) {
      case 200:
        return {
          bg: '#F5C0CC',
          text: '#E82E56',
          border: '#BF396C',
          lightBg: '#FFEAEB',
          darkBg: '#BF396C',
          cbnText: '#C22967',
          name: '₦200'
        };
      case 1000:
        return {
          bg: '#CAE5FF',
          text: '#2A5B93',
          border: '#1C4578',
          lightBg: '#AAD5FF',
          darkBg: '#1C4578',
          cbnText: '#1C4578',
          name: '₦1,000'
        };
      case 500:
      default:
        return {
          bg: '#BDEBBF',
          text: '#1D8F21',
          border: '#1A3A1B',
          lightBg: '#E1F5DD',
          darkBg: '#1A3A1B',
          cbnText: '#09500C',
          name: '₦500'
        };
    }
  };

  // Render a simulated native iOS Status Bar
  const renderStatusBar = (isDark = false) => {
    return (
      <div className={`flex justify-between items-center px-6 pt-3 pb-1 text-xs font-semibold select-none ${isDark ? 'text-white' : 'text-black'}`}>
        <div>13:09</div>
        <div className="w-20 h-4 bg-black rounded-full absolute left-1/2 -translate-x-1/2 top-2 flex items-center justify-center">
          <div className="w-3 h-3 bg-neutral-900 rounded-full border border-neutral-800 absolute left-2"></div>
        </div>
        <div className="flex items-center space-x-1.5">
          <span>5G</span>
          {/* Signal Icon */}
          <div className="flex items-end space-x-0.5 h-2.5">
            <div className={`w-0.5 h-1 rounded-full ${isDark ? 'bg-white' : 'bg-black'}`}></div>
            <div className={`w-0.5 h-1.5 rounded-full ${isDark ? 'bg-white' : 'bg-black'}`}></div>
            <div className={`w-0.5 h-2 rounded-full ${isDark ? 'bg-white' : 'bg-black'}`}></div>
            <div className={`w-0.5 h-2.5 rounded-full ${isDark ? 'bg-white' : 'bg-black'}`}></div>
          </div>
          {/* Battery Icon */}
          <div className={`w-5 h-2.5 rounded border p-0.5 flex items-center ${isDark ? 'border-white' : 'border-black'}`}>
            <div className={`h-full w-full rounded-sm ${isDark ? 'bg-white' : 'bg-black'}`}></div>
          </div>
        </div>
      </div>
    );
  };

  // Render simulated iOS home indicator line at bottom
  const renderHomeIndicator = (isDark = false) => {
    return (
      <div className="w-full flex justify-center py-2 bg-transparent select-none z-50">
        <div className={`w-32 h-1.5 rounded-full ${isDark ? 'bg-white/40' : 'bg-black/20'}`}></div>
      </div>
    );
  };

  return (
    <div className="app-container">
      
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-14 left-4 right-4 bg-[#181818] text-white py-3 px-4 rounded-2xl shadow-xl flex items-center space-x-2.5 z-[99] border border-white/10"
          >
            <div className="bg-[#23BC29]/20 p-1.5 rounded-lg">
              <Info size={16} className="text-[#23BC29]" />
            </div>
            <span className="text-sm font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col relative overflow-hidden h-full">
        <AnimatePresence mode="wait">
          
          {/* SCREEN 1: HOME DASHBOARD */}
          {currentScreen === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex-1 flex flex-col h-full bg-[#F0F0F0]"
            >
              {/* Safe-area top padding — no simulated status bar, iOS provides it */}
              <div style={{ paddingTop: 'max(54px, env(safe-area-inset-top))' }} />

              {/* ── Header ── */}
              <div className="flex justify-between items-center px-[15px] pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-tr from-[#1A3A1B] to-[#23BC29] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    EL
                  </div>
                  <div>
                    <h2 className="text-[17px] leading-[22px] font-bold text-black">{LOGGED_IN_USER.greeting}</h2>
                    <p className="text-[12px] leading-[16px] font-medium text-[#808180]">Who dey celebrate?</p>
                  </div>
                </div>
                {/* Bell with numeric badge */}
                <div className="relative cursor-pointer active:scale-95 transition-transform">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-[#E4E4E4] shadow-sm">
                    <Bell size={18} className="text-black" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#C11A00] rounded-full border-2 border-[#F0F0F0] flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white leading-none">3</span>
                  </div>
                </div>
              </div>

              {/* ── Scrollable content ── */}
              <div className="flex-1 overflow-y-auto no-scrollbar pb-28">

                {/* Currency selector pill */}
                <div className="flex justify-center pb-[22px]">
                  <button 
                    style={{
                      width: '105px',
                      height: '37px',
                      borderRadius: '100px',
                      gap: '5px',
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#FFF',
                      border: '1px solid #E4E4E4'
                    }}
                    className="shadow-sm active:scale-95 transition-transform"
                  >
                    <span className="text-[15px]">🇳🇬</span>
                    <span className="text-[13px] font-semibold text-black">NGN</span>
                    <ChevronDown size={12} className="text-[#808180]" />
                  </button>
                </div>

                {/* Balance Grouping - Spacing: 0px (minimal/no extra margins on child elements) */}
                <div className="text-center px-[15px] pb-[25px] flex flex-col items-center justify-center" style={{ gap: '0px' }}>
                  <p 
                    style={{
                      fontFamily: 'var(--font-geist)',
                      fontWeight: 400,
                      fontSize: '12px',
                      lineHeight: '100%',
                      color: '#868686',
                      margin: 0,
                      padding: 0
                    }}
                  >
                    Spray balance
                  </p>
                  <div className="flex justify-center items-center gap-1 mt-[2px]">
                    <span style={{ fontFamily: 'var(--font-inter)', fontSize: '26px', color: '#BFBFBF', lineHeight: '100%', fontWeight: 400 }}>₦</span>
                    <span style={{ fontFamily: 'var(--font-geist)', fontSize: '40px', fontWeight: 600, color: '#000', letterSpacing: '-1.5px', lineHeight: '100%' }}>
                      {isBalanceVisible
                        ? walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '••••••'}
                    </span>
                    <button onClick={() => setIsBalanceVisible(!isBalanceVisible)} className="text-[#808180] ml-1">
                      {isBalanceVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* ── Action buttons ── */}
                <div className="px-[15px] pb-[25px]">
                  <div 
                    className="w-full bg-[#E4E4E4] flex items-center justify-between gap-[8px]" 
                    style={{ 
                      height: '94px', 
                      borderRadius: '30px', 
                      padding: '10px',
                      opacity: 1 
                    }}
                  >
                    {[
                      { label: 'Top Up',  icon: <Plus size={22} className="text-[#1D8F21]" />,   action: () => triggerToast('Top-up: Bank Transfer or Card') },
                      { label: 'My QR',   icon: <QrCode size={20} className="text-[#1D8F21]" />, action: () => triggerToast('My QR Code') },
                      { label: 'Scan',    icon: <Scan size={20} className="text-[#1D8F21]" />,   action: () => navigateTo('spray_someone') },
                    ].map(({ label, icon, action }) => (
                      <div key={label} className="flex-1 flex flex-col items-center gap-[4px] justify-center">
                        <button
                          onClick={action}
                          style={{ 
                            height: '50px', 
                            width: '50px', 
                            borderRadius: '100px' 
                          }}
                          className="bg-white flex items-center justify-center active:scale-95 transition-all shadow-sm flex-shrink-0"
                        >
                          {icon}
                        </button>
                        <span 
                          style={{
                            fontFamily: 'var(--font-geist)',
                            fontWeight: 700,
                            fontSize: '12px',
                            lineHeight: '100%',
                            textAlign: 'center',
                            color: '#474747'
                          }}
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Banner — 3 stacked rectangles (111px height, 30px rounded) ── */}
                <div className="px-[15px] pb-[35px]">
                  <div className="relative" style={{ height: '119px' }}>
                    {/* Back rect (10% opacity) */}
                    <div 
                      style={{ 
                        position: 'absolute', 
                        bottom: '0px', 
                        left: '16px', 
                        right: '16px', 
                        height: '111px', 
                        background: '#1A3A1B', 
                        opacity: 0.1, 
                        borderRadius: '30px', 
                        zIndex: 1 
                      }} 
                    />
                    {/* Mid rect (20% opacity) */}
                    <div 
                      style={{ 
                        position: 'absolute', 
                        bottom: '4px', 
                        left: '8px', 
                        right: '8px', 
                        height: '111px', 
                        background: '#1A3A1B', 
                        opacity: 0.2, 
                        borderRadius: '30px', 
                        zIndex: 2 
                      }} 
                    />
                    {/* Main card (100% opacity) */}
                    <div 
                      className="absolute top-0 left-0 right-0 bg-[#1A3A1B] overflow-hidden" 
                      style={{ 
                        height: '111px', 
                        borderRadius: '30px', 
                        zIndex: 3 
                      }}
                    >
                      {/* Illustration placeholder right side */}
                      <div className="absolute right-0 top-0 bottom-0 w-[42%] flex items-center justify-center bg-[#2D5A2D]">
                        <div className="text-center opacity-30">
                          <div className="w-14 h-8 bg-[#23BC29] rounded mx-auto mb-1" />
                          <div className="text-white text-[9px]">[ illustration ]</div>
                        </div>
                      </div>
                      {/* Left content */}
                      <div className="absolute left-0 top-0 bottom-0 w-[58%] p-4 flex flex-col justify-between">
                        <div>
                          <h3 className="text-[18px] font-bold text-white leading-tight">{RECIPIENT.name}</h3>
                          <p className="text-[11px] text-[#BDEBBF] mt-0.5">Upcoming Birthday event</p>
                        </div>
                        <button
                          onClick={() => navigateTo('spray_someone')}
                          className="bg-[#23BC29] text-black font-bold text-[12px] py-[6px] px-4 rounded-full self-start active:scale-95 transition-transform"
                        >
                          Spray Temi
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Recent Activity card ── */}
                <div 
                  className="mx-[15px] bg-white border border-[#E4E4E4] shadow-sm flex flex-col"
                  style={{
                    height: '514px',
                    borderRadius: '20px',
                    padding: '15px 15px 10px 15px',
                    gap: '10px',
                    opacity: 1
                  }}
                >
                  <h4 className="text-[16px] font-bold text-black">Recent activity</h4>

                  {/* Search + Filter — split */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 relative" style={{ height: '40px' }}>
                      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#868686]" />
                      <input
                        type="text"
                        placeholder="Search Transactions"
                        style={{
                          height: '40px',
                          borderRadius: '50px',
                          background: '#F0F0F0',
                          paddingLeft: '34px',
                          paddingRight: '12px',
                          fontFamily: 'var(--font-geist)',
                          fontWeight: 400,
                          fontSize: '14px',
                          lineHeight: '24px'
                        }}
                        className="w-full text-black placeholder-[#868686] focus:outline-none"
                      />
                    </div>
                    {/* Filter */}
                    <button 
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '44px',
                        background: '#F0F0F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      className="flex-shrink-0 active:scale-95 transition-transform border border-[#EBEBEB]"
                    >
                      <SlidersHorizontal size={14} className="text-[#474747]" />
                    </button>
                  </div>

                  {/* Today label */}
                  <p className="text-[11px] text-[#808180] font-medium">Today</p>

                  {/* Transaction rows */}
                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-[14px]">
                    {RECENT_TRANSACTIONS.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between">
                        {/* Left — avatar + name/date */}
                        <div className="flex items-center space-x-2.5">
                          <div 
                            style={{ width: '42px', height: '42px' }}
                            className="rounded-full bg-gradient-to-br from-neutral-300 to-neutral-400 flex items-center justify-center flex-shrink-0 relative"
                          >
                            <span className="text-[11px] font-bold text-white">{tx.name.split(' ').map(n => n[0]).join('')}</span>
                            <div 
                              style={{ 
                                width: '20px', 
                                height: '20px', 
                                borderRadius: '55.56px', 
                                padding: '5.56px', 
                                gap: '5.56px',
                                background: '#000'
                              }}
                              className="absolute -bottom-1 -right-1 flex items-center justify-center border border-white"
                            >
                              <ArrowUp size={8} className="text-white transform rotate-45" />
                            </div>
                          </div>
                          <div>
                            <p 
                              style={{ 
                                fontFamily: 'var(--font-geist)', 
                                fontWeight: 600, 
                                fontSize: '14px', 
                                lineHeight: '24px',
                                color: '#000' 
                              }}
                              className="leading-[17px]"
                            >
                              {tx.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p 
                                style={{ 
                                  fontFamily: 'var(--font-geist)', 
                                  fontWeight: 400, 
                                  fontSize: '12px', 
                                  lineHeight: '100%', 
                                  color: '#868686' 
                                }}
                              >
                                {tx.date}
                              </p>
                              {tx.status === 'Pending' && (
                                <span className="text-[10px] font-medium text-[#E8605A] bg-[#FFE8E7] px-1.5 py-0.5 rounded-full">Pending</span>
                              )}
                              {tx.status === 'Completed' && (
                                <span className="text-[10px] font-medium text-[#1D8F21] bg-[#E1F5DD] px-1.5 py-0.5 rounded-full">Completed</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Right — amount + balance */}
                        <div className="text-right">
                          <p 
                            style={{ 
                              fontSize: '16px', 
                              fontWeight: 600, 
                              color: '#000' 
                            }}
                          >
                            +<span className="naira">₦</span>{tx.amount.toLocaleString()}.00
                          </p>
                          <p 
                            style={{ 
                              fontSize: '12px', 
                              fontWeight: 400, 
                              color: '#868686' 
                            }}
                          >
                            <span className="naira">₦</span>{tx.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>{/* end scrollable */}

              {/* ── Bottom Navigation Pill ── */}
              <div className="absolute bottom-6 left-[15px] right-[15px] z-40">
                <div className="bg-[#181818] rounded-full flex items-center justify-between px-3 py-2.5 shadow-2xl">
                  {/* Home (active) */}
                  <button className="flex items-center space-x-2 bg-[#2C2C2C] rounded-full px-3.5 py-2 active:scale-95 transition-transform">
                    <User size={16} className="text-white" />
                    <span className="text-white text-[13px] font-semibold">Home</span>
                  </button>
                  {/* Gift */}
                  <button onClick={() => triggerToast('Occasions')} className="w-10 h-10 rounded-full bg-[#2C2C2C] flex items-center justify-center active:scale-95 transition-transform">
                    <Gift size={18} className="text-[#808180]" />
                  </button>
                  {/* Stats */}
                  <button onClick={() => triggerToast('Stats')} className="w-10 h-10 rounded-full bg-[#2C2C2C] flex items-center justify-center active:scale-95 transition-transform">
                    <BarChart2 size={18} className="text-[#808180]" />
                  </button>
                  {/* FAB */}
                  <button
                    onClick={() => navigateTo('spray_someone')}
                    className="w-12 h-12 bg-[#23BC29] rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                  >
                    <ArrowUp size={20} className="text-black" strokeWidth={2.5} />
                  </button>
                </div>
              </div>

            </motion.div>
          )}

          {/* SCREEN 2: SPRAY SOMEONE (SCAN / SEARCH) */}
          {currentScreen === 'spray_someone' && (
            <motion.div
              key="spray_someone"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              className="flex-1 flex flex-col h-full bg-[#F0F0F0]"
            >
              {renderStatusBar(false)}

              {/* Header */}
              <div className="flex items-center px-4 py-3 relative border-b border-[#E4E4E4]">
                <button 
                  onClick={navigateBack}
                  className="w-9 h-9 rounded-full bg-white flex items-center justify-center border border-[#E4E4E4] hover:bg-neutral-50 active:scale-90 transition-transform"
                >
                  <ArrowLeft size={16} className="text-black" />
                </button>
                <h2 className="text-md font-bold text-black absolute left-1/2 -translate-x-1/2">Spray Someone</h2>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 space-y-6">
                
                {/* Horizontal Contacts list */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold text-[#808180] uppercase tracking-wider">Recent Celebrants</h3>
                  <div className="flex space-x-4 overflow-x-auto no-scrollbar py-2">
                    {CONTACTS.map((c) => (
                      <button 
                        key={c.id} 
                        onClick={() => {
                          setSearchTag(c.tag);
                          setShowAutocomplete(true);
                          if (c.id === 'temi') {
                            // Quick fill for Temi Nwosu
                            navigateTo('ready_to_spray');
                          }
                        }}
                        className="flex flex-col items-center space-y-1.5 flex-shrink-0 cursor-pointer group"
                      >
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold relative transition-all group-hover:scale-105 active:scale-95 ${
                          c.live 
                            ? 'bg-gradient-to-tr from-[#1A3A1B] to-[#23BC29] text-white p-0.5 ring-2 ring-[#23BC29] ring-offset-2' 
                            : 'bg-white border border-[#E4E4E4] text-neutral-700'
                        }`}>
                          <div className="w-full h-full rounded-full bg-[#1A3A1B] flex items-center justify-center text-white">
                            {c.avatar}
                          </div>
                          {c.live && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#23BC29] rounded-full border-2 border-white live-dot-pulse"></span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-neutral-800">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inline Search / Tag Input */}
                <div className="space-y-2.5 relative">
                  <h3 className="text-xs font-bold text-[#808180] uppercase tracking-wider">Search by Username</h3>
                  <div className="relative">
                    <input 
                      type="text"
                      value={searchTag}
                      onChange={(e) => {
                        setSearchTag(e.target.value);
                        setShowAutocomplete(e.target.value.length > 0);
                      }}
                      placeholder="@username"
                      className="w-full bg-white border border-[#D9D9D9] rounded-2xl py-3 pl-10 pr-4 text-sm font-semibold placeholder-[#868686] text-black focus:outline-none focus:ring-2 focus:ring-[#1A3A1B]"
                    />
                    <span className="absolute left-4 top-3.5 text-[#868686] font-bold text-sm">@</span>
                  </div>

                  {/* Autocomplete list dropdown */}
                  <AnimatePresence>
                    {showAutocomplete && filteredContacts.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute left-0 right-0 bg-white border border-[#D9D9D9] rounded-2xl shadow-lg mt-1.5 overflow-hidden z-50 max-h-60"
                      >
                        {filteredContacts.map((c) => (
                          <div 
                            key={c.id} 
                            onClick={() => {
                              setSearchTag(c.tag);
                              setShowAutocomplete(false);
                              if (c.id === 'temi') {
                                navigateTo('ready_to_spray');
                              } else {
                                triggerToast(`Selected ${c.name}`);
                              }
                            }}
                            className="flex items-center justify-between p-3.5 hover:bg-[#F0F0F0] cursor-pointer transition-colors border-b border-[#E4E4E4] last:border-0"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-full bg-[#1A3A1B] text-white flex items-center justify-center font-bold text-xs">
                                {c.avatar}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-black">{c.name}</p>
                                <p className="text-[10px] font-semibold text-[#808180]">
                                  {c.tag.split('').map((char, i) => {
                                    // Highlight matching characters in green
                                    const match = c.tag.toLowerCase().indexOf(searchTag.toLowerCase().replace('@', ''));
                                    const length = searchTag.replace('@', '').length;
                                    if (match >= 0 && i >= match && i < match + length) {
                                      return <span key={i} className="text-[#1D8F21] font-bold">{char}</span>;
                                    }
                                    return char;
                                  })}
                                </p>
                              </div>
                            </div>
                            {c.live && (
                              <span className="bg-[#23BC29]/20 text-[#1D8F21] text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center">
                                <span className="w-1.5 h-1.5 bg-[#23BC29] rounded-full mr-1.5 live-dot-pulse"></span>
                                Live
                              </span>
                            )}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Divider QR Code */}
                <div className="flex items-center my-2 select-none">
                  <div className="flex-1 h-[1px] bg-[#D9D9D9]"></div>
                  <span className="px-4 text-[10px] font-extrabold text-[#808180] uppercase tracking-wider">or scan a QR Code</span>
                  <div className="flex-1 h-[1px] bg-[#D9D9D9]"></div>
                </div>

                {/* QR Scanner Mockup */}
                <div className="bg-[#142E15]/90 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden aspect-square border border-[#23BC29]/20 shadow-inner">
                  {/* Camera lens simulated backdrop grid */}
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                  
                  {/* Neon brackets for scanning */}
                  <div className="w-[180px] h-[180px] border border-white/10 rounded-2xl relative flex items-center justify-center bg-black/40">
                    
                    {/* Brackets */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#23BC29] rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#23BC29] rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#23BC29] rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#23BC29] rounded-br-lg"></div>

                    {/* Animated Scanning Line */}
                    <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#23BC29] to-transparent shadow-[0_0_8px_#23BC29] qr-scan-line"></div>

                    {/* Faux QR image in center */}
                    <QrCode size={100} className="text-white/20" />
                  </div>

                  <p className="text-[11px] text-[#BDEBBF] font-bold text-center mt-5 tracking-wide max-w-[80%]">
                    Align QR code in the camera viewport to scan automatically
                  </p>
                </div>

                {/* Bottom QR sharing row */}
                <div className="bg-white rounded-2xl p-4 border border-[#E4E4E4] flex items-center justify-between cursor-pointer hover:bg-neutral-50 active:scale-[0.99] transition-all">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-[#E1F5DD] flex items-center justify-center">
                      <QrCode size={16} className="text-[#1D8F21]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-black">Share my QR Code</p>
                      <p className="text-[10px] font-semibold text-[#808180]">Let others scan and spray you</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[#808180]" />
                </div>

              </div>

              {renderHomeIndicator(false)}
            </motion.div>
          )}

          {/* SCREEN 3: READY TO SPRAY */}
          {currentScreen === 'ready_to_spray' && (
            <motion.div
              key="ready_to_spray"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              className="flex-1 flex flex-col h-full bg-[#F0F0F0] relative"
            >
              {renderStatusBar(false)}

              {/* Header */}
              <div className="flex items-center px-4 py-3 relative border-b border-[#E4E4E4]">
                <button 
                  onClick={navigateBack}
                  className="w-9 h-9 rounded-full bg-white flex items-center justify-center border border-[#E4E4E4]"
                >
                  <ArrowLeft size={16} className="text-black" />
                </button>
                <h2 className="text-md font-bold text-black absolute left-1/2 -translate-x-1/2">Ready to Spray</h2>
              </div>

              {/* Scroll Content */}
              <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 pb-32 space-y-6">
                
                {/* Recipient Profile Card */}
                <div className="flex flex-col items-center text-center space-y-3 pt-2">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#1C4578] to-[#2A5B93] p-1.5 relative shadow-md">
                    <div className="w-full h-full rounded-full bg-[#1A3A1B] text-white flex items-center justify-center font-bold text-2xl">
                      TN
                    </div>
                    <span className="absolute bottom-1 right-1 w-5 h-5 bg-[#23BC29] rounded-full border-4 border-white live-dot-pulse"></span>
                  </div>

                  <div>
                    <h3 className="text-[20px] leading-[26px] font-bold text-black">{RECIPIENT.name}</h3>
                    <p className="text-xs font-semibold text-[#808180]">{RECIPIENT.tag} · {RECIPIENT.location}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-neutral-800 flex items-center bg-white border border-[#E4E4E4] px-3.5 py-1 rounded-full shadow-sm">
                      <span className="naira mr-1">₦</span>{RECIPIENT.sprayedSoFar.toLocaleString()} Sprayed
                    </span>
                    <span className="bg-[#23BC29]/20 text-[#1D8F21] text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider flex items-center">
                      <span className="w-1.5 h-1.5 bg-[#23BC29] rounded-full mr-1.5 live-dot-pulse"></span>
                      {RECIPIENT.activeSprayers} Spraying
                    </span>
                  </div>
                </div>

                {/* Event info list */}
                <div className="bg-white rounded-3xl p-5 border border-[#E4E4E4] shadow-sm space-y-3.5 text-xs font-semibold">
                  <div className="flex justify-between items-center py-0.5 border-b border-[#E4E4E4] pb-2">
                    <span className="text-[#808180]">Occasion</span>
                    <span className="text-black font-bold">{RECIPIENT.event}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-[#E4E4E4] pb-2">
                    <span className="text-[#808180]">Venue</span>
                    <span className="text-black font-bold">{RECIPIENT.venue}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#808180]">Session Closes</span>
                    <span className="text-black font-bold">{RECIPIENT.sessionCloses}</span>
                  </div>
                </div>

                {/* Amount entry block */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#808180] uppercase tracking-wider text-center">Enter spray amount</h4>
                  
                  <div className="bg-white rounded-3xl p-5 border border-[#E4E4E4] shadow-sm flex items-center justify-between">
                    <span className="text-[34px] font-bold text-black flex items-center tracking-tight">
                      <span className="naira mr-2 text-neutral-400">₦</span>
                      {sprayAmount.toLocaleString('en-US')}
                    </span>
                    <div className="bg-[#F0F0F0] px-3.5 py-1.5 rounded-full text-xs font-bold text-[#474747] border border-[#E4E4E4]">
                      NGN ▾
                    </div>
                  </div>

                  {/* Wallet Balance notice */}
                  <p className="text-[11px] text-center font-bold text-[#808180]">
                    Wallet Balance: <span className="naira text-[10px]">₦</span>{walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Quick Chips */}
                <div className="grid grid-cols-4 gap-2">
                  {[25000, 50000, 100000, 200000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => handleQuickAmount(amt)}
                      className={`py-2 px-1 rounded-full text-xs font-extrabold border transition-all text-center ${
                        sprayAmount === amt 
                          ? 'bg-[#1A3A1B] text-white border-transparent' 
                          : 'bg-white border-[#E4E4E4] text-[#474747] hover:bg-neutral-50 shadow-sm'
                      }`}
                    >
                      <span className="naira text-[10px]">₦</span>{amt >= 1000 ? `${amt/1000}k` : amt}
                    </button>
                  ))}
                </div>

                {/* Grid Custom Numpad */}
                <div className="bg-white/60 rounded-3xl p-4 border border-[#E4E4E4] grid grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleNumpadPress(num)}
                      className="bg-white hover:bg-neutral-50 active:scale-95 transition-all text-black font-extrabold text-lg py-3 rounded-2xl border border-[#E4E4E4] shadow-sm"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={() => handleNumpadPress('C')}
                    className="bg-red-50 hover:bg-red-100 text-[#C11A00] font-extrabold text-sm py-3 rounded-2xl border border-red-200/50 flex items-center justify-center"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => handleNumpadPress(0)}
                    className="bg-white hover:bg-neutral-50 text-black font-extrabold text-lg py-3 rounded-2xl border border-[#E4E4E4] shadow-sm"
                  >
                    0
                  </button>
                  <button
                    onClick={() => handleNumpadPress('Done')}
                    className="bg-[#23BC29] hover:bg-[#1D8F21] text-black font-extrabold text-sm py-3 rounded-2xl shadow-sm flex items-center justify-center"
                  >
                    Done
                  </button>
                </div>

              </div>

              {/* Sticky bottom Start Spraying CTA */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#F0F0F0] via-[#F0F0F0] to-transparent pt-4 pb-6 px-6 z-40">
                <button
                  onClick={() => {
                    if (sprayAmount > 0) {
                      if (sprayAmount > walletBalance) {
                        triggerToast("Insufficient wallet balance!");
                        return;
                      }
                      setShowNoteSheet(true);
                    }
                  }}
                  disabled={sprayAmount <= 0}
                  className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wider uppercase transition-all shadow-md ${
                    sprayAmount > 0 
                      ? 'bg-[#1A3A1B] text-white hover:bg-[#09500C] active:scale-95' 
                      : 'bg-neutral-300 text-neutral-500 cursor-not-allowed shadow-none'
                  }`}
                >
                  Start Spraying
                </button>
              </div>

              {renderHomeIndicator(false)}
            </motion.div>
          )}

          {/* SCREEN 5: MAIN SPRAY SCREEN */}
          {currentScreen === 'spray_screen' && (
            <motion.div
              key="spray_screen"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              className="flex-1 flex flex-col h-full bg-[#F0F0F0] relative overflow-hidden"
            >
              {renderStatusBar(false)}

              {/* Flying Notes Container (z-50 overlays) */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
                <AnimatePresence>
                  {flyingNotes.map((note) => {
                    const theme = getNoteTheme(note.denom);
                    return (
                      <motion.div
                        key={note.id}
                        initial={{ 
                          y: 650, 
                          x: 100 + note.drift, 
                          rotation: note.angle, 
                          scale: 0.8, 
                          opacity: 1 
                        }}
                        animate={{ 
                          y: -300, 
                          x: 100 + note.drift * 2.5, 
                          rotation: note.angle * 2, 
                          scale: note.scale * 0.7, 
                          opacity: 0 
                        }}
                        transition={{ duration: 0.75, ease: "easeOut" }}
                        className="absolute w-36 h-20 rounded-lg shadow-2xl border flex flex-col justify-between p-1 z-50"
                        style={{
                          backgroundColor: theme.bg,
                          borderColor: theme.border,
                          color: theme.text
                        }}
                      >
                        {/* Realistic Micro details */}
                        <div className="flex justify-between items-start text-[6px] font-bold">
                          <span className="uppercase text-[5px]">CBN</span>
                          <span className="naira font-black">{note.denom}</span>
                        </div>
                        <div className="flex justify-center my-0.5">
                          {/* Face avatar mock */}
                          <div className="w-5 h-5 rounded-full border border-current opacity-40 bg-current/10"></div>
                        </div>
                        <div className="flex justify-between items-end text-[4px] font-extrabold uppercase">
                          <span>Central Bank of Nigeria</span>
                          <span>{theme.name}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Compact top header row */}
              <div className="flex justify-between items-center px-6 py-3 border-b border-[#E4E4E4]/40 z-30">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-[#1A3A1B] text-white flex items-center justify-center font-bold text-xs relative shadow-inner">
                    TN
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#23BC29] rounded-full border-2 border-white live-dot-pulse"></span>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-black">{RECIPIENT.name}</h3>
                    <p className="text-[10px] font-semibold text-[#808180]">{RECIPIENT.event}</p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setShowSessionDetailsSheet(true);
                  }}
                  className="bg-white border border-[#E4E4E4] px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase text-neutral-800 tracking-wider shadow-sm flex items-center space-x-1"
                >
                  <span>Stats</span>
                  <ChevronRight size={12} className="transform -rotate-90" />
                </button>
              </div>

              {/* Main Workspace: Note Spraying area */}
              <div className="flex-1 flex flex-col justify-between items-center px-6 py-4 z-20">
                
                {/* Session remaining stats */}
                <div className="text-center space-y-1 mt-1 select-none">
                  <span className="text-[10px] tracking-[0.08em] uppercase font-bold text-[#808180]">REMAINING IN SESSION</span>
                  <div className="flex justify-center items-center">
                    <span className="text-[34px] font-bold tracking-tight text-black flex items-center">
                      <span className="naira mr-1">₦</span>
                      {remainingSprayAmount.toLocaleString()}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-48 h-2 bg-neutral-200 rounded-full mx-auto overflow-hidden mt-1 border border-[#E4E4E4]/60">
                    <div 
                      className="h-full bg-[#23BC29] transition-all duration-300 rounded-full"
                      style={{ width: `${(remainingSprayAmount / initialSprayAmount) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* PORTRAIT NAIRA NOTE WORKSPACE CARD */}
                <div className="relative w-full max-w-[270px] aspect-[1/2] my-3 flex flex-col justify-center items-center">
                  
                  {/* Swipe gestures hints */}
                  <div className="absolute -top-6 left-0 right-0 flex justify-between px-2 text-[9px] font-bold text-[#808180] uppercase tracking-widest pointer-events-none select-none">
                    <span>Swipe ◂ note</span>
                    <span>Swipe UP to Spray ▴</span>
                    <span>note ▸ Swipe</span>
                  </div>

                  {/* Note design */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedDenom}
                      initial={{ x: 100, opacity: 0, scale: 0.95 }}
                      animate={{ x: 0, opacity: 1, scale: 1 }}
                      exit={{ x: -100, opacity: 0, scale: 0.95 }}
                      transition={{ ease: "easeInOut", duration: 0.25 }}
                      // Drag gestures
                      drag="y"
                      dragConstraints={{ top: 0, bottom: 0 }}
                      onDragEnd={(e, info) => {
                        // Spray upwards on drag up
                        if (info.offset.y < -80) {
                          handleSprayNote();
                        }
                      }}
                      className="w-full h-full rounded-2xl shadow-xl border flex flex-col relative overflow-hidden cursor-grab active:cursor-grabbing group select-none"
                      style={{
                        backgroundColor: getNoteTheme(selectedDenom).bg,
                        borderColor: getNoteTheme(selectedDenom).border,
                        borderWidth: '3px'
                      }}
                    >
                      {/* Watermark spirals */}
                      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black via-transparent to-transparent pointer-events-none"></div>

                      {/* Header Panel */}
                      <div className="p-4 flex justify-between items-start z-10">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-extrabold uppercase leading-none tracking-widest opacity-80" style={{ color: getNoteTheme(selectedDenom).cbnText }}>
                            CENTRAL BANK OF NIGERIA
                          </span>
                          <span className="text-[7px] font-bold opacity-60 mt-0.5">FEDERAL REPUBLIC OF NIGERIA</span>
                        </div>
                        <span className="text-xl font-black naira" style={{ color: getNoteTheme(selectedDenom).text }}>
                          {selectedDenom}
                        </span>
                      </div>

                      {/* Middle Body */}
                      <div className="flex-1 flex flex-col justify-between p-4 relative z-10">
                        
                        {/* Serial Number & Watermark circle */}
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col text-[7px] font-mono leading-none opacity-60">
                            <span>W/31</span>
                            <span>081607</span>
                          </div>
                          
                          {/* Holographic Watermark Circle */}
                          <div className="w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center opacity-40 bg-white/20" style={{ borderColor: getNoteTheme(selectedDenom).border }}>
                            <span className="text-[10px] font-bold naira">₦</span>
                          </div>
                        </div>

                        {/* Silhouette portrait */}
                        <div className="flex justify-center items-center my-3 relative">
                          <div className="w-24 h-24 rounded-full border border-current opacity-40 flex items-center justify-center bg-current/5 shadow-inner">
                            <span className="text-[34px] font-bold opacity-20">₦</span>
                          </div>
                          {/* Ribbon details */}
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-[#1A3A1B]/10 border border-[#1A3A1B]/20 py-0.5 px-3 rounded-full text-[8px] font-bold uppercase tracking-wider" style={{ color: getNoteTheme(selectedDenom).text }}>
                            OFFICIAL USE ONLY
                          </div>
                        </div>

                        {/* CBN Governor details */}
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col text-[6px] font-bold opacity-60">
                            <span>GOVERNOR</span>
                            <div className="w-12 h-px bg-current my-0.5"></div>
                            <span>DIRECTOR OF CURRENCY</span>
                          </div>
                          <span className="text-[10px] font-extrabold uppercase" style={{ color: getNoteTheme(selectedDenom).cbnText }}>
                            {getNoteTheme(selectedDenom).name}
                          </span>
                        </div>
                      </div>

                      {/* Drag Area Overlay */}
                      <div 
                        onClick={handleSprayNote}
                        className="absolute inset-0 flex items-center justify-center bg-black/0 active:bg-black/5 transition-colors z-20 rounded-2xl"
                      >
                        <div className="opacity-0 group-hover:opacity-40 transition-opacity bg-black/40 text-white rounded-full py-2 px-4 text-xs font-bold pointer-events-none">
                          Swipe Up / Tap to Spray
                        </div>
                      </div>

                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Left/Right swipe controllers */}
                <div className="flex items-center justify-between w-full max-w-[270px] select-none">
                  <button 
                    onClick={() => changeDenom('right')}
                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-[#E4E4E4] hover:bg-neutral-50 shadow-sm active:scale-90 transition-transform"
                  >
                    <ArrowLeft size={16} className="text-black" />
                  </button>
                  
                  <div className="flex space-x-1.5">
                    {[200, 500, 1000].map((d) => (
                      <button
                        key={d}
                        onClick={() => setSelectedDenom(d)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${selectedDenom === d ? 'bg-[#1A3A1B] scale-125' : 'bg-neutral-300'}`}
                      ></button>
                    ))}
                  </div>

                  <button 
                    onClick={() => changeDenom('left')}
                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-[#E4E4E4] hover:bg-neutral-50 shadow-sm active:scale-90 transition-transform"
                  >
                    <ChevronRight size={16} className="text-black" />
                  </button>
                </div>

              </div>

              {/* Bottom collapsed session strip */}
              <div 
                onClick={() => setShowSessionDetailsSheet(true)}
                className="bg-[#181818] text-white mx-6 mb-6 rounded-2xl p-4 flex justify-between items-center cursor-pointer shadow-lg hover:bg-neutral-900 active:scale-[0.99] transition-all z-30 border border-white/5"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full bg-[#1A3A1B] text-white flex items-center justify-center font-bold text-[9px] border border-[#181818]">KA</div>
                    <div className="w-7 h-7 rounded-full bg-[#1C4578] text-white flex items-center justify-center font-bold text-[9px] border border-[#181818]">BI</div>
                    <div className="w-7 h-7 rounded-full bg-neutral-600 text-white flex items-center justify-center font-bold text-[8px] border border-[#181818]">+2</div>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase text-neutral-400 tracking-wider">Also Spraying</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-neutral-400 leading-none">SESSION TOTAL</p>
                    <p className="text-sm font-extrabold text-[#23BC29] mt-0.5 flex items-center justify-end">
                      <span className="naira mr-0.5">₦</span>{initialSprayAmount.toLocaleString()}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-neutral-500 transform -rotate-90" />
                </div>
              </div>

              {renderHomeIndicator(false)}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* SCREEN 4: PICK YOUR NOTE (BOTTOM SHEET OVER SCREEN 3) */}
      <AnimatePresence>
        {showNoteSheet && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end">
            
            {/* Backdrop Dims */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNoteSheet(false)}
              className="absolute inset-0 bg-black"
            />

            {/* Bottom Sheet Card */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative bg-white rounded-t-[36px] px-6 pt-3 pb-8 z-50 space-y-6 shadow-2xl border-t border-white/10"
            >
              {/* Drag Handle */}
              <div className="w-12 h-1.5 bg-[#DEDEDE] rounded-full mx-auto cursor-pointer" onClick={() => setShowNoteSheet(false)}></div>

              <div className="text-center space-y-1">
                <h3 className="text-xl font-bold text-black">Pick your note</h3>
                <p className="text-xs font-semibold text-[#808180]">Which denomination do you want to spray?</p>
              </div>

              {/* Amount confirmation badge */}
              <div className="bg-[#E1F5DD] rounded-2xl p-4 flex justify-between items-center border border-[#BDEBBF]">
                <span className="text-xs font-bold text-[#1D8F21] uppercase tracking-wider">Spraying Total</span>
                <span className="text-xl font-black text-[#1D8F21] flex items-center">
                  <span className="naira mr-1">₦</span>{sprayAmount.toLocaleString()}
                </span>
              </div>

              {/* Three Note cards row */}
              <div className="grid grid-cols-3 gap-2.5">
                
                {/* ₦200 Card */}
                <div 
                  onClick={() => setSelectedDenom(200)}
                  className={`rounded-2xl p-3.5 border-2 text-center cursor-pointer transition-all flex flex-col justify-between h-[130px] ${
                    selectedDenom === 200 
                      ? 'border-[#BF396C] bg-[#F5C0CC] scale-105 shadow-md' 
                      : 'border-transparent bg-neutral-50 hover:bg-neutral-100 opacity-80'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${selectedDenom === 200 ? 'border-[#BF396C] bg-[#BF396C]' : 'border-neutral-400'}`}>
                      {selectedDenom === 200 && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                    </span>
                    <span className="text-xs font-extrabold text-[#C22967]">₦200</span>
                  </div>
                  <div className="my-2">
                    <div className="w-8 h-4 bg-[#BF396C]/20 border border-[#BF396C]/30 rounded mx-auto"></div>
                  </div>
                  <div>
                    <p className="text-[12px] font-black text-[#C22967] leading-none">
                      {Math.ceil(sprayAmount / 200).toLocaleString()} notes
                    </p>
                  </div>
                </div>

                {/* ₦500 Card */}
                <div 
                  onClick={() => setSelectedDenom(500)}
                  className={`rounded-2xl p-3.5 border-2 text-center cursor-pointer transition-all flex flex-col justify-between h-[130px] ${
                    selectedDenom === 500 
                      ? 'border-[#1A3A1B] bg-[#BDEBBF] scale-105 shadow-md' 
                      : 'border-transparent bg-neutral-50 hover:bg-neutral-100 opacity-80'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${selectedDenom === 500 ? 'border-[#1A3A1B] bg-[#1A3A1B]' : 'border-neutral-400'}`}>
                      {selectedDenom === 500 && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                    </span>
                    <span className="text-xs font-extrabold text-[#1D8F21]">₦500</span>
                  </div>
                  <div className="my-2">
                    <div className="w-8 h-4 bg-[#1D8F21]/20 border border-[#1D8F21]/30 rounded mx-auto"></div>
                  </div>
                  <div>
                    <p className="text-[12px] font-black text-[#1D8F21] leading-none">
                      {Math.ceil(sprayAmount / 500).toLocaleString()} notes
                    </p>
                  </div>
                </div>

                {/* ₦1000 Card */}
                <div 
                  onClick={() => setSelectedDenom(1000)}
                  className={`rounded-2xl p-3.5 border-2 text-center cursor-pointer transition-all flex flex-col justify-between h-[130px] ${
                    selectedDenom === 1000 
                      ? 'border-[#1C4578] bg-[#CAE5FF] scale-105 shadow-md' 
                      : 'border-transparent bg-neutral-50 hover:bg-neutral-100 opacity-80'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${selectedDenom === 1000 ? 'border-[#1C4578] bg-[#1C4578]' : 'border-neutral-400'}`}>
                      {selectedDenom === 1000 && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                    </span>
                    <span className="text-xs font-extrabold text-[#2A5B93]">₦1,000</span>
                  </div>
                  <div className="my-2">
                    <div className="w-8 h-4 bg-[#2A5B93]/20 border border-[#2A5B93]/30 rounded mx-auto"></div>
                  </div>
                  <div>
                    <p className="text-[12px] font-black text-[#2A5B93] leading-none">
                      {Math.ceil(sprayAmount / 1000).toLocaleString()} notes
                    </p>
                  </div>
                </div>

              </div>

              <p className="text-[10px] text-center font-bold text-[#808180] tracking-wide py-1 select-none">
                💡 Swipe left or right during spray to switch notes on the fly
              </p>

              <button
                onClick={startSprayingSession}
                className="w-full py-4 bg-[#1A3A1B] hover:bg-[#09500C] text-white rounded-2xl font-bold text-sm tracking-wider uppercase transition-all shadow-md active:scale-95"
              >
                Start Spraying
              </button>

            </motion.div>

          </div>
        )}
      </AnimatePresence>

      {/* SCREEN 5 BOTTOM SHEET: SESSION DETAILS */}
      <AnimatePresence>
        {showSessionDetailsSheet && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end">
            
            {/* Backdrop Dims */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSessionDetailsSheet(false)}
              className="absolute inset-0 bg-black"
            />

            {/* Bottom Sheet Card */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative bg-white rounded-t-[36px] px-6 pt-3 pb-8 z-50 space-y-6 shadow-2xl border-t border-white/10"
            >
              {/* Drag Handle */}
              <div className="w-12 h-1.5 bg-[#DEDEDE] rounded-full mx-auto cursor-pointer" onClick={() => setShowSessionDetailsSheet(false)}></div>

              {/* Recipient summary info inside sheet */}
              <div className="flex items-center space-x-3.5 border-b border-[#E4E4E4] pb-4">
                <div className="w-12 h-12 rounded-full bg-[#1A3A1B] text-white flex items-center justify-center font-bold text-md">
                  TN
                </div>
                <div>
                  <h4 className="text-sm font-bold text-black">{RECIPIENT.name}</h4>
                  <p className="text-[10px] font-semibold text-[#808180]">Spraying session active · {RECIPIENT.event}</p>
                </div>
              </div>

              {/* Session detailed calculations */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-[#F0F0F0] rounded-2xl p-4 border border-[#E4E4E4]/60 text-center">
                  <p className="text-[10px] font-bold text-[#808180] uppercase tracking-wider">Session Total</p>
                  <p className="text-lg font-black text-black mt-1 flex items-center justify-center">
                    <span className="naira mr-0.5">₦</span>{initialSprayAmount.toLocaleString()}
                  </p>
                </div>
                <div className="bg-[#E1F5DD] rounded-2xl p-4 border border-[#BDEBBF] text-center">
                  <p className="text-[10px] font-bold text-[#1D8F21] uppercase tracking-wider">Sprayed So Far</p>
                  <p className="text-lg font-black text-[#1D8F21] mt-1 flex items-center justify-center">
                    <span className="naira mr-0.5">₦</span>{(initialSprayAmount - remainingSprayAmount).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Active Sprayers list */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-[#808180] uppercase tracking-wider">Who's Spraying Active</h4>
                
                <div className="space-y-2.5 max-h-40 overflow-y-auto no-scrollbar pr-1">
                  
                  {/* Current User */}
                  <div className="flex justify-between items-center bg-[#E1F5DD]/40 border border-[#BDEBBF]/30 p-2.5 rounded-xl">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1A3A1B] to-[#23BC29] text-white flex items-center justify-center font-bold text-xs">
                        EL
                      </div>
                      <div>
                        <p className="text-xs font-bold text-black">Elo (You)</p>
                        <p className="text-[9px] font-semibold text-[#808180]">Sprayed {sprayedNotesCount} notes</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-black flex items-center">
                      <span className="naira mr-0.5">₦</span>{(initialSprayAmount - remainingSprayAmount).toLocaleString()}
                    </span>
                  </div>

                  {/* Kunle */}
                  <div className="flex justify-between items-center p-2 border border-[#E4E4E4] rounded-xl">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#1C4578] text-white flex items-center justify-center font-bold text-xs">
                        KA
                      </div>
                      <div>
                        <p className="text-xs font-bold text-black">Kunle Adeola</p>
                        <p className="text-[9px] font-semibold text-[#808180]">joined 3 mins ago</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-black flex items-center">
                      <span className="naira mr-0.5">₦</span>30,000
                    </span>
                  </div>

                  {/* Bimpe */}
                  <div className="flex justify-between items-center p-2 border border-[#E4E4E4] rounded-xl">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#BF396C] text-white flex items-center justify-center font-bold text-xs">
                        BI
                      </div>
                      <div>
                        <p className="text-xs font-bold text-black">Bimpe Ige</p>
                        <p className="text-[9px] font-semibold text-[#808180]">joined 5 mins ago</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-black flex items-center">
                      <span className="naira mr-0.5">₦</span>30,000
                    </span>
                  </div>

                </div>
              </div>

              {/* Action Buttons inside Session Details */}
              <div className="grid grid-cols-2 gap-3.5 pt-2">
                <button
                  onClick={() => {
                    setShowSessionDetailsSheet(false);
                    triggerToast("Added ₦25,000 to session!");
                    setRemainingSprayAmount(prev => prev + 25000);
                    setInitialSprayAmount(prev => prev + 25000);
                  }}
                  className="py-3.5 bg-neutral-100 hover:bg-neutral-200 text-black border border-[#E4E4E4] rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-1 active:scale-95"
                >
                  <Plus size={14} className="text-[#1D8F21]" />
                  <span>Top Up</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowSessionDetailsSheet(false);
                    triggerToast("Spraying session completed!");
                    navigateTo('home');
                  }}
                  className="py-3.5 bg-red-50 hover:bg-red-100 text-[#C11A00] border border-red-200/50 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-1 active:scale-95"
                >
                  <LogOut size={14} />
                  <span>End Session</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

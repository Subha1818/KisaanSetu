import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  X,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Send,
  Calendar,
  Search,
  RefreshCw,
  Sprout,
  History,
  ChevronRight,
  Sparkles,
  FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { generateTokenPDF, generateProcurementReceipt } from '../../utils/pdfGenerator';
import { calculateArrivalWindow } from '../../utils/arrivalEstimator';
import { NUMBER_EMOJIS, parseNumberFromText } from '../../utils/numberParser';

interface AgentMessage {
  id: string;
  sender: 'agent' | 'user';
  text: string;
  timestamp: string;
  options?: Array<{
    id: string;
    label: string;
    sublabel?: string;
    icon?: any;
    color?: string;
    action: () => void;
  }>;
  cardType?: 'booking_status' | 'msp_list' | 'history_list' | 'booking_success';
  cardData?: any;
}

const BCP47_LANG_MAP: Record<string, string> = {
  hi: 'hi-IN',
  'hi-in': 'hi-IN',
  en: 'en-US',
  'en-us': 'en-US',
  'en-in': 'en-IN',
  bn: 'bn-IN',
  'bn-in': 'bn-IN',
  mr: 'mr-IN',
  'mr-in': 'mr-IN',
  te: 'te-IN',
  'te-in': 'te-IN',
  ta: 'ta-IN',
  'ta-in': 'ta-IN',
  pa: 'pa-IN',
  'pa-in': 'pa-IN'
};

const AGENT_I18N: Record<string, {
  welcome: string;
  book_label: string;
  book_sub: string;
  status_label: string;
  status_sub: string;
  resched_label: string;
  resched_sub: string;
  msp_label: string;
  msp_sub: string;
  history_label: string;
  history_sub: string;
  voice_label: string;
  voice_sub: string;
  voice_help: string;
  header_title: string;
  header_subtitle: string;
  placeholder_default: string;
  placeholder_listening: string;
  thinking: string;
}> = {
  en: {
    welcome: "Namaste {name}! I am 'Kisaan Saathi AI' 🤖. How can I assist you today? Select any option below or speak into the mic:",
    book_label: "📅 Book Appointment",
    book_sub: "Select depot & date slot for crop delivery",
    status_label: "🔍 Check Booking Status",
    status_sub: "View active token, queue position & window",
    resched_label: "🔄 Reschedule / Cancel",
    resched_sub: "Modify or cancel active appointment",
    msp_label: "🌾 Government MSP Rates",
    msp_sub: "Check benchmark crop prices per quintal",
    history_label: "📜 Procurement History",
    history_sub: "Past accepted sales & payment receipt download",
    voice_label: "🔊 Listen to Audio Help",
    voice_sub: "Listen to spoken instructions",
    voice_help: "Welcome to KisaanSetu. You can book an appointment using the green button, check your queue position with the blue button, or view crop prices with the orange button.",
    header_title: "Kisaan Saathi AI 🤖",
    header_subtitle: "Speak or tap buttons for easy help",
    placeholder_default: "Type or select an option above...",
    placeholder_listening: "Listening... speak now",
    thinking: "Kisaan Saathi is processing..."
  },
  hi: {
    welcome: "नमस्ते {name}! मैं हूँ 'किसान साथी AI' 🤖। आपकी क्या सहायता करूँ? नीचे दिए गए विकल्पों में से किसी एक को चुनें या बोलकर बताएं:",
    book_label: "📅 नया टोकन बुक करें",
    book_sub: "फसल बिक्री हेतु तिथि और डिपो चुनें",
    status_label: "🔍 बुकिंग स्थिति व कतार देखें",
    status_sub: "सक्रिय टोकन, नंबर और समय जांचें",
    resched_label: "🔄 तिथि बदलें / रद्द करें",
    resched_sub: "सक्रिय बुकिंग में बदलाव करें",
    msp_label: "🌾 सरकारी एमएसपी (MSP) दरें",
    msp_sub: "गेहूं, धान, मक्का आदि के सरकारी भाव",
    history_label: "📜 पुराना खरीद इतिहास व रसीद",
    history_sub: "पिछला भुगतान और रसीद डाउनलोड करें",
    voice_label: "🔊 आवाज़ से निर्देश सुनें",
    voice_sub: "सहायक निर्देशों को बोलकर सुनें",
    voice_help: "किसान साथी पोर्टल में आपका स्वागत है। आप ऊपर दिए गए हरे बटन से टोकन बुक कर सकते हैं, नीले बटन से अपनी कतार का नंबर देख सकते हैं, और नारंगी बटन से फसलों का सरकारी मूल्य जान सकते हैं।",
    header_title: "किसान साथी AI 🤖",
    header_subtitle: "बोलो या बटन दबाओ - आसान सहायता",
    placeholder_default: "संदेश लिखें या ऊपर के बटन दबाएं...",
    placeholder_listening: "सुन रहा हूँ... बोलिए",
    thinking: "किसान साथी सोच रहा है..."
  },
  bn: {
    welcome: "নমস্কার {name}! আমি 'কিশান সাথী AI' 🤖। আপনাকে কীভাবে সাহায্য করতে পারি? নিচের যেকোনো একটি অপশন বেছে নিন:",
    book_label: "📅 নতুন টোকেন বুক করুন",
    book_sub: "ফসল বিক্রয়ের তারিখ এবং ডিপো নির্বাচন করুন",
    status_label: "🔍 বুকিং এর অবস্থা দেখুন",
    status_sub: "টোকেন নম্বর এবং সিরিয়াল দেখুন",
    resched_label: "🔄 তারিখ পরিবর্তন/বাতিল করুন",
    resched_sub: "আপনার বুকিং সংশোধন করুন",
    msp_label: "🌾 সরকারি এমএসপি (MSP) দর",
    msp_sub: "শস্যের সরকারি ন্যূনতম দর দেখুন",
    history_label: "📜 ক্রয়ের ইতিহাস ও রশিদ",
    history_sub: "পূর্ববর্তী বিক্রয় এবং পেমেন্ট রশিদ",
    voice_label: "🔊 অডিও সাহায্য শুনুন",
    voice_sub: "ভয়েস নির্দেশাবলী শুনুন",
    voice_help: "কিশান সাথী পোর্টালে আপনাকে স্বাগতম। আপনি সবুজ বোতামটি ব্যবহার করে একটি অ্যাপয়েন্টমেন্ট বুক করতে পারেন।",
    header_title: "কিশান সাথী AI 🤖",
    header_subtitle: "কথা বলুন বা বোতাম টিপুন - সহজ সাহায্য",
    placeholder_default: "বার্তা লিখুন বা উপরের বোতাম চাপুন...",
    placeholder_listening: "শুনছি... কথা বলুন",
    thinking: "কিশান সাথী প্রক্রিয়া করছে..."
  },
  mr: {
    welcome: "नमस्कार {name}! मी 'किसान साथी AI' 🤖 आहे. मी तुम्हाला कशी मदत करू शकेन? खालील पर्यायांपैकी एक निवडा:",
    book_label: "📅 नवीन टोकन बुक करा",
    book_sub: "पिक विक्रीसाठी केंद्र आणि तारीख निवडा",
    status_label: "🔍 टोकन स्थिती तपासा",
    status_sub: "सक्रिय टोकन आणि रांगेचा क्रमांक पहा",
    resched_label: "🔄 तारीख बदला / रद्द करा",
    resched_sub: "बुकिंगमध्ये बदल करा",
    msp_label: "🌾 शासकीय एमएसपी (MSP) दर",
    msp_sub: "पिकांचे शासकीय हमीभाव पहा",
    history_label: "📜 खरेदी इतिहास व पावती",
    history_sub: "मागील विक्री व पावती डाउनलोड करा",
    voice_label: "🔊 आवाजात सूचना ऐका",
    voice_sub: "आवाजात मदत ऐका",
    voice_help: "किसान साथी पोर्टलवर आपले स्वागत आहे. आपण हिरवे बटण वापरून टोकन बुक करू शकता.",
    header_title: "किसान साथी AI 🤖",
    header_subtitle: "बोला किंवा बटण दाबा - सुलभ मदत",
    placeholder_default: "संदेश टाइप करा किंवा पर्याय निवडा...",
    placeholder_listening: "ऐकत आहे... बोला",
    thinking: "किसान साथी प्रक्रिया करत आहे..."
  },
  te: {
    welcome: "నమస్కారం {name}! నేను 'కిసాన్ సాథీ AI' 🤖. మీకు ఎలా సహాయపడగలను? కింద ఉన్న ఆప్షన్‌లలో ఒకదాన్ని ఎంచుకోండి:",
    book_label: "📅 కొత్త టోకెన్ బుక్ చేయండి",
    book_sub: "పంట విక్రయం కోసం కేంద్రం మరియు తేదీని ఎంచుకోండి",
    status_label: "🔍 బుకింగ్ స్థితిని చూడండి",
    status_sub: "మీ టోకెన్ మరియు క్యూ స్థానాన్ని తనిఖీ చేయండి",
    resched_label: "🔄 తేదీ మార్చండి / రద్దు చేయండి",
    resched_sub: "మీ బుకింగ్‌ను సవరించండి",
    msp_label: "🌾 ప్రభుత్వ మద్దతు ధరలు (MSP)",
    msp_sub: "పంటల ప్రభుత్వ మద్దతు ధరలను చూడండి",
    history_label: "📜 కొనుగోలు చరిత్ర మరియు రసీదు",
    history_sub: "గత విక్రయాలు మరియు రసీదు డౌన్‌లోడ్",
    voice_label: "🔊 వాయిస్ సూచనలను వినండి",
    voice_sub: "వాయిస్ సహాయాన్ని వినండి",
    voice_help: "కిసాన్ సాథీ పోర్టల్‌కు స్వాగతం. మీరు ఆకుపచ్చ బటన్‌ను ఉపయోగించి టోకెన్ బుక్ చేసుకోవచ్చు.",
    header_title: "కిసాన్ సాథీ AI 🤖",
    header_subtitle: "మాట్లాడండి లేదా బటన్లను నొక్కండి - సులభమైన సహాయం",
    placeholder_default: "సందేశాన్ని టైప్ చేయండి లేదా ఆప్షన్‌ను ఎంచుకోండి...",
    placeholder_listening: "వింటున్నాను... మాట్లాడండి",
    thinking: "కిసాన్ సాథీ ఆలోచిస్తోంది..."
  },
  ta: {
    welcome: "வணக்கம் {name}! நான் 'கிசான் சாதி AI' 🤖. உங்களுக்கு எவ்வாறு உதவ முடியும்? கீழே உள்ள விருப்பங்களில் ஒன்றைத் தேர்ந்தெடுக்கவும்:",
    book_label: "📅 புதிய டோக்கன் பதிவு செய்க",
    book_sub: "பயிர் விற்பனைக்கு மையம் மற்றும் தேதியைத் தேர்ந்தெடுக்கவும்",
    status_label: "🔍 பதிவின் நிலையைக் காண்க",
    status_sub: "உங்கள் டோக்கன் மற்றும் வரிசை நிலையைப் பார்க்கவும்",
    resched_label: "🔄 தேதியை மாற்ற / ரத்து செய்ய",
    resched_sub: "உங்கள் பதிவை திருத்தவும்",
    msp_label: "🌾 அரசு ஆதரவு விலை (MSP)",
    msp_sub: "பயிர்களின் அரசு ஆதரவு விலையைப் பார்க்கவும்",
    history_label: "📜 கொள்முதல் வரலாறு & ரசீது",
    history_sub: "முந்தைய விற்பனை மற்றும் ரசீது பதிவிறக்கம்",
    voice_label: "🔊 குரல் வழிகாட்டுதலைக் கேட்க",
    voice_sub: "குரல் உதவியைக் கேட்கவும்",
    voice_help: "கிசான் சாதி போர்ட்டலுக்கு உங்களை வரவேற்கிறோம். பச்சை பொத்தானைப் பயன்படுத்தி டோக்கன் பதிவு செய்யலாம்.",
    header_title: "கிசான் சாதி AI 🤖",
    header_subtitle: "பேசுங்கள் அல்லது பொத்தான்களை அழுத்தவும் - எளிய உதவி",
    placeholder_default: "செய்தியைத் தட்டச்சு செய்யவும் அல்லது தேர்வை அழுத்தவும்...",
    placeholder_listening: "கேட்கிறது... பேசுங்கள்",
    thinking: "கிசான் சாதி செயல்படுத்துகிறது..."
  },
  pa: {
    welcome: "ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ {name}! ਮੈਂ 'ਕਿਸਾਨ ਸਾਥੀ AI' 🤖 ਹਾਂ। ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ? ਹੇਠਾਂ ਦਿੱਤੇ ਵਿਕਲਪਾਂ ਵਿੱਚੋਂ ਇੱਕ ਚੁਣੋ:",
    book_label: "📅 ਨਵਾਂ ਟੋਕਨ ਬੁੱਕ ਕਰੋ",
    book_sub: "ਫ਼ਸਲ ਵੇਚਣ ਲਈ ਕੇਂਦਰ ਅਤੇ ਮਿਤੀ ਚੁਣੋ",
    status_label: "🔍 ਬੁਕਿੰਗ ਦੀ ਸਥਿਤੀ ਦੇਖੋ",
    status_sub: "ਆਪਣਾ ਟੋਕਨ ਅਤੇ ਕਤਾਰ ਨੰਬਰ ਦੇਖੋ",
    resched_label: "🔄 ਮਿਤੀ ਬਦਲੋ / ਰੱਦ ਕਰੋ",
    resched_sub: "ਆਪਣੀ ਬੁਕਿੰਗ ਵਿੱਚ ਬਦਲਾਅ ਕਰੋ",
    msp_label: "🌾 ਸਰਕਾਰੀ ਐਮਐਸਪੀ (MSP) ਰੇਟ",
    msp_sub: "ਫ਼ਸਲਾਂ ਦੇ ਸਰਕਾਰੀ ਰੇਟ ਦੇਖੋ",
    history_label: "📜 ਖਰੀਦ ਇਤਿਹਾਸ ਅਤੇ ਰਸੀਦ",
    history_sub: "ਪੁਰਾਣਾ ਭੁਗਤਾਨ ਅਤੇ ਰਸੀਦ ਡਾਊਨਲੋਡ ਕਰੋ",
    voice_label: "🔊 ਆਵਾਜ਼ ਵਿੱਚ ਮਦਦ ਸੁਣੋ",
    voice_sub: "ਆਵਾਜ਼ ਵਿੱਚ ਨਿਰਦੇਸ਼ ਸੁਣੋ",
    voice_help: "ਕਿਸਾਨ ਸਾਥੀ ਪੋਰਟਲ 'ਤੇ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ। ਤੁਸੀਂ ਹਰੇ ਬਟਨ ਦੀ ਵਰਤੋਂ ਕਰਕੇ ਟੋਕਨ ਬੁੱਕ ਕਰ ਸਕਦੇ ਹੋ।",
    header_title: "ਕਿਸਾਨ ਸਾਥੀ AI 🤖",
    header_subtitle: "ਬੋਲੋ ਜਾਂ ਬਟਨ ਦਬਾਓ - ਆਸਾਨ ਮਦਦ",
    placeholder_default: "ਸੁਨੇਹਾ ਲਿਖੋ ਜਾਂ ਉੱਪਰ ਦਿੱਤਾ ਬਟਨ ਦਬਾਓ...",
    placeholder_listening: "ਸੁਣ ਰਿਹਾ ਹਾਂ... ਬੋਲੋ",
    thinking: "ਕਿਸਾਨ ਸਾਥੀ ਸੋਚ ਰਿਹਾ ਹੈ..."
  }
};

const KISAAN_FLOW_I18N: Record<string, {
  login_required: string;
  login_btn: string;
  active_token_exist: (token: number, centre: string, crop: string, qty: number, date: string) => string;
  view_status_btn: string;
  resched_cancel_btn: string;
  main_menu_btn: string;
  no_centres_avail: string;
  step1_block: string;
  all_centres_btn: string;
  search_centre_btn: string;
  no_centres_in_block: string;
  step2_centre: (block: string) => string;
  capacity_label: string;
  farmer_per_day: string;
  load_crop_err: string;
  max_limit: string;
  step3_crop: string;
  step4_qty: string;
  select_centre_first: string;
  select_centre_btn: string;
  booked_count_label: string;
  step5_date: string;
  load_date_err: (msg: string) => string;
  retry_btn: string;
  invalid_booking_selection: string;
  restart_booking_btn: string;
  booking_success_title: (name: string, token: number) => string;
  download_pass_btn: string;
  go_dashboard_btn: string;
  booking_failed: (msg: string) => string;
  try_again_btn: string;
  no_active_token: string;
  book_now_btn: string;
  live_status_title: (token: number) => string;
  check_status_err: string;
  no_active_to_cancel: string;
  window_closed: (token: number, hours: number) => string;
  reschedule_prompt: (token: number, crop: string, qty: number, centre: string) => string;
  cancel_booking_btn: string;
  reschedule_new_date_btn: string;
  cancel_success: (token: number) => string;
  cancel_failed: (msg: string) => string;
  msp_title: string;
  msp_failed: string;
  no_history_found: string;
  no_completed_history: string;
  history_title: (count: number) => string;
  history_failed: string;
  auto_recommend_centre: (centreName: string, blockName: string) => string;
  auto_yes_btn: (centreName: string) => string;
  choose_other_btn: string;
  ask_location_permission: string;
  allow_location_btn: string;
  manual_location_btn: string;
  loc_detecting: string;
  loc_failed_fallback: string;
  nearest_centre_found: (centreName: string, distanceKm: number | undefined, blockName: string) => string;
}> = {
  en: {
    login_required: "Please log in first to book an appointment.",
    login_btn: "🔑 Go to Login",
    active_token_exist: (token, centre, crop, qty, date) => `⚠️ You already have an active Token #${token} at ${centre} (${crop}, ${qty}kg, Date: ${date}).\n\nYou can only hold one active booking token at a time. Please manage your existing token before booking a new one:`,
    view_status_btn: "🔍 Check Booking Status",
    resched_cancel_btn: "🔄 Reschedule / Cancel",
    main_menu_btn: "🏠 Main Menu",
    no_centres_avail: "Sorry, no active procurement centres available at the moment.",
    step1_block: "Step 1: Please select your Block (Area) where your farm is located:",
    all_centres_btn: "🌐 View All Centers",
    search_centre_btn: "🔍 Search Centre by Name",
    no_centres_in_block: "No procurement centers available in this block. Please pick another:",
    step2_centre: (block) => `Step 2: Pick your preferred Procurement Centre in ${block}:`,
    capacity_label: "Capacity",
    farmer_per_day: "farmers/day",
    load_crop_err: "Error loading crop products.",
    max_limit: "Max Limit",
    step3_crop: "Step 3: Which crop do you wish to deliver? Select below:",
    step4_qty: "Step 4: Select quantity (in kg) you wish to deliver:",
    select_centre_first: "Please select your procurement centre first.",
    select_centre_btn: "🏢 Select Centre",
    booked_count_label: "Booked",
    step5_date: "Step 5: Select your preferred drop-off date:",
    load_date_err: (msg) => `Error loading dates: ${msg}`,
    retry_btn: "🔄 Retry",
    invalid_booking_selection: "Invalid booking selection. Please restart.",
    restart_booking_btn: "🔄 Restart Booking",
    booking_success_title: (name, token) => `🎉 Congratulations ${name}! Your token #${token} has been successfully booked!`,
    download_pass_btn: "📄 Download Pass PDF",
    go_dashboard_btn: "📊 Go to Dashboard",
    booking_failed: (msg) => `❌ Booking failed: ${msg}`,
    try_again_btn: "Try Again",
    no_active_token: "You have no active procurement tokens currently.",
    book_now_btn: "📅 Book Appointment Now",
    live_status_title: (token) => `Here is the live status of your active Token #${token}:`,
    check_status_err: "Error checking status.",
    no_active_to_cancel: "You have no eligible active booking to reschedule or cancel.",
    window_closed: (token, hours) => `⚠️ Modification window closed for Token #${token}.\n\nPer depot policy, bookings cannot be cancelled or rescheduled within ${hours} hours of the drop-off date.`,
    reschedule_prompt: (token, crop, qty, centre) => `What would you like to do with Token #${token} (${crop}, ${qty}kg, Centre: ${centre})?`,
    cancel_booking_btn: "❌ Cancel Booking",
    reschedule_new_date_btn: "📅 Reschedule to New Date",
    cancel_success: (token) => `✅ Token #${token} has been cancelled successfully.`,
    cancel_failed: (msg) => `⚠️ Cannot cancel token: ${msg}`,
    msp_title: "Government Minimum Support Price (MSP) benchmarks:",
    msp_failed: "Failed to fetch MSP rates.",
    no_history_found: "No prior procurement history found.",
    no_completed_history: "No completed procurement records found.",
    history_title: (count) => `Here is your past ${count} completed procurement records:`,
    history_failed: "Failed to load procurement history.",
    auto_recommend_centre: (c, b) => `📍 Your nearest procurement centre is **${c}** (${b}). Would you like to book your crop delivery slot here? Say 1 or tap Yes, or say 2 to choose another centre.`,
    auto_yes_btn: (c) => `1️⃣ ✅ Yes, Book at ${c}`,
    choose_other_btn: "2️⃣ 🔍 Choose Another Mandi / Search",
    ask_location_permission: "📍 May I access your device location to automatically find the nearest procurement centre for you?\n\nSay 1 or tap 'Yes', or say 2 to choose block manually.",
    allow_location_btn: "1️⃣ 📍 Yes, Use My Location",
    manual_location_btn: "2️⃣ 🗺️ Choose Block Manually",
    loc_detecting: "📍 Detecting your current location...",
    loc_failed_fallback: "Unable to access GPS location. Showing available procurement centres by block.",
    nearest_centre_found: (c, d, b) => `📍 Your nearest procurement centre is **${c}** ${d !== undefined ? `(${d.toFixed(1)} km away in ${b})` : `(${b})`}. Would you like to book your crop delivery slot here? Say 1 or tap Yes, or say 2 to choose another centre.`
  },
  hi: {
    login_required: "टोकन बुक करने के लिए कृपया पहले लॉगिन करें।",
    login_btn: "🔑 लॉगिन पेज पर जाएँ",
    active_token_exist: (token, centre, crop, qty, date) => `⚠️ आपके पास पहले से ही ${centre} पर एक सक्रिय टोकन #${token} (${crop}, ${qty}kg, तिथि: ${date}) मौजूद है।\n\nएक समय में केवल एक ही सक्रिय टोकन रखा जा सकता है। नया टोकन बुक करने से पहले कृपया अपने मौजूदा टोकन को संभालें:`,
    view_status_btn: "🔍 बुकिंग स्थिति व कतार देखें",
    resched_cancel_btn: "🔄 टोकन बदलें / रद्द करें",
    main_menu_btn: "🏠 मुख्य मेनू",
    no_centres_avail: "क्षमा करें, वर्तमान में कोई भी खरीद केंद्र उपलब्ध नहीं है।",
    step1_block: "चरण 1: कृपया अपना ब्लॉक (क्षेत्र) चुनें जहाँ आपकी फ़सल है:",
    all_centres_btn: "🌐 पूरे पोर्टल पर खोजें",
    search_centre_btn: "🔍 नाम से केंद्र खोजें",
    no_centres_in_block: "इस ब्लॉक में कोई केंद्र उपलब्ध नहीं है। कृपया दूसरा ब्लॉक चुनें:",
    step2_centre: (block) => `चरण 2: ${block} क्षेत्र में अपना पसंदीदा खरीद केंद्र (डिपो) चुनें:`,
    capacity_label: "क्षमता",
    farmer_per_day: "किसान/दिन",
    load_crop_err: "फसल सूची लोड करने में त्रुटि।",
    max_limit: "अधिकतम सीमा",
    step3_crop: "चरण 3: आप कौन सी फसल बेचना चाहते हैं? नीचे से चुनें:",
    step4_qty: "चरण 4: आप कितना वजन (किग्रा में) जमा करना चाहते हैं? विकल्प चुनें:",
    select_centre_first: "कृपया पहले अपना खरीद केंद्र चुनें।",
    select_centre_btn: "🏢 केंद्र चुनें",
    booked_count_label: "बुक किए गए",
    step5_date: "चरण 5: अपनी सुविधा अनुसार ड्रॉप-ऑफ की तिथि चुनें:",
    load_date_err: (msg) => `तिथि लोड करने में त्रुटि: ${msg}`,
    retry_btn: "🔄 पुनः प्रयास करें",
    invalid_booking_selection: "बुकिंग जानकारी अमान्य है। कृपया पुनः प्रयास करें।",
    restart_booking_btn: "🔄 पुनः प्रारंभ करें",
    booking_success_title: (name, token) => `🎉 बधाई हो ${name}! आपका टोकन नंबर #${token} सफलतापूर्वक बुक हो गया है!`,
    download_pass_btn: "📄 पास पीडीएफ डाउनलोड करें",
    go_dashboard_btn: "📊 डैशबोर्ड पर जाएं",
    booking_failed: (msg) => `❌ बुकिंग विफल: ${msg}`,
    try_again_btn: "पुनः प्रयास करें",
    no_active_token: "आपके पास वर्तमान में कोई सक्रिय टोकन नहीं है।",
    book_now_btn: "📅 नया टोकन बुक करें",
    live_status_title: (token) => `आपके सक्रिय टोकन #${token} की वर्तमान स्थिति नीचे दी गई है:`,
    check_status_err: "स्थिति प्राप्त करने में त्रुटि हुई।",
    no_active_to_cancel: "आपके पास रद्द करने या बदलने के लिए कोई योग्य सक्रिय बुकिंग नहीं है।",
    window_closed: (token, hours) => `⚠️ टोकन #${token} का संशोधन समय समाप्त हो चुका है।\n\nखरीद केंद्र नियमों के अनुसार, स्लॉट तिथि से ${hours} घंटे पहले ही टोकन रद्द या रिशेड्यूल किया जा सकता है।`,
    reschedule_prompt: (token, crop, qty, centre) => `टोकन #${token} (${crop}, ${qty}kg, केंद्र: ${centre}) के लिए आप क्या करना चाहते हैं?`,
    cancel_booking_btn: "❌ बुकिंग रद्द करें",
    reschedule_new_date_btn: "📅 नई तिथि चुनें (रिशेड्यूल)",
    cancel_success: (token) => `✅ टोकन #${token} सफलतापूर्वक रद्द कर दिया गया है।`,
    cancel_failed: (msg) => `⚠️ टोकन रद्द नहीं किया जा सका: ${msg}`,
    msp_title: "सरकार द्वारा घोषित न्यूनतम समर्थन मूल्य (MSP) दरें नीचे दी गई हैं:",
    msp_failed: "एमएसपी दरें लोड नहीं हो सकीं।",
    no_history_found: "आपका कोई पिछला खरीद इतिहास नहीं पाया गया।",
    no_completed_history: "कोई पूर्ण खरीद इतिहास रिकॉर्ड उपलब्ध नहीं है।",
    history_title: (count) => `आपके पिछले ${count} खरीद भुगतानों का विवरण नीचे दिया गया है:`,
    history_failed: "इतिहास लोड नहीं हो सका।",
    auto_recommend_centre: (c, b) => `📍 आपके सबसे पास का खरीद केंद्र **${c}** (${b}) है। क्या आप अपनी फसल डिलीवरी का टोकन यहाँ बुक करना चाहते हैं? 1 बोलें या 'हाँ' दबाएं, या अन्य केंद्रों के लिए 2 बोलें।`,
    auto_yes_btn: (c) => `1️⃣ ✅ हाँ, ${c} पर बुक करें`,
    choose_other_btn: "2️⃣ 🔍 दूसरी मंडी चुनें / खोजें",
    ask_location_permission: "📍 क्या मैं आपके निकटतम खरीद केंद्र का पता लगाने के लिए आपकी लोकेशन (स्थान) का उपयोग कर सकता हूँ?\n\n1 बोलें या 'हाँ' दबाएं, या ब्लॉक चुनने के लिए 2 बोलें।",
    allow_location_btn: "1️⃣ 📍 हाँ, लोकेशन का उपयोग करें",
    manual_location_btn: "2️⃣ 🗺️ खुद ब्लॉक चुनें",
    loc_detecting: "📍 आपकी लोकेशन खोजी जा रही है...",
    loc_failed_fallback: "लोकेशन प्राप्त नहीं हो सकी। सभी उपलब्ध केंद्र ब्लॉक के अनुसार दिखाए जा रहे हैं।",
    nearest_centre_found: (c, d, b) => `📍 आपके सबसे पास का खरीद केंद्र **${c}** ${d !== undefined ? `(${d.toFixed(1)} किमी दूर, ${b})` : `(${b})`} है। क्या आप यहाँ टोकन बुक करना चाहते हैं? 1 बोलें या 'हाँ' दबाएं, या अन्य केंद्रों के लिए 2 बोलें।`
  },
  bn: {
    login_required: "টোকেন বুক করতে অনুগ্রহ করে প্রথমে লগইন করুন।",
    login_btn: "🔑 লগইন পেজে যান",
    active_token_exist: (token, centre, crop, qty, date) => `⚠️ আপনার ইতিমধ্যে ${centre}-এ একটি সক্রিয় টোকেন #${token} (${crop}, ${qty}kg, তারিখ: ${date}) রয়েছে।\n\nএকবারে কেবল একটি সক্রিয় বুকিং টোকেন রাখা যাবে।`,
    view_status_btn: "🔍 বুকিং এর অবস্থা দেখুন",
    resched_cancel_btn: "🔄 টোকেন পরিবর্তন/বাতিল করুন",
    main_menu_btn: "🏠 প্রধান মেনু",
    no_centres_avail: "ক্ষমা করবেন, বর্তমানে কোনো সক্রিয় ক্রয় কেন্দ্র উপলব্ধ নেই।",
    step1_block: "ধাপ ১: আপনার জমি যে ব্লকে অবস্থিত তা নির্বাচন করুন:",
    all_centres_btn: "🌐 সমস্ত কেন্দ্র দেখুন",
    search_centre_btn: "🔍 নাম দিয়ে কেন্দ্র খুঁজুন",
    no_centres_in_block: "এই ব্লকে কোনো ক্রয় কেন্দ্র উপলব্ধ নেই। অন্য একটি বেছে নিন:",
    step2_centre: (block) => `ধাপ ২: ${block} এলাকায় আপনার পছন্দের ক্রয় কেন্দ্র (ডিপো) বেছে নিন:`,
    capacity_label: "ক্ষমতা",
    farmer_per_day: "কৃষক/দিন",
    load_crop_err: "ফসল তালিকা লোড করতে ত্রুটি।",
    max_limit: "সর্বোচ্চ সীমা",
    step3_crop: "ধাপ ৩: আপনি কোন ফসল বিক্রি করতে চান? নিচ থেকে বেছে নিন:",
    step4_qty: "ধাপ ৪: আপনি কত পরিমাণ (কেজিতে) সরবরাহ করতে চান? নির্বাচন করুন:",
    select_centre_first: "অনুগ্রহ করে প্রথমে ক্রয় কেন্দ্র নির্বাচন করুন।",
    select_centre_btn: "🏢 কেন্দ্র নির্বাচন করুন",
    booked_count_label: "বুক করা হয়েছে",
    step5_date: "ধাপ ৫: আপনার সুবিধাজনক ড্রপ-অফ তারিখ নির্বাচন করুন:",
    load_date_err: (msg) => `তারিখ লোড করতে ত্রুটি: ${msg}`,
    retry_btn: "🔄 পুনরায় চেষ্টা করুন",
    invalid_booking_selection: "বুকিং তথ্য অবৈধ। অনুগ্রহ করে পুনরায় চেষ্টা করুন।",
    restart_booking_btn: "🔄 পুনরায় শুরু করুন",
    booking_success_title: (name, token) => `🎉 অভিনন্দন ${name}! আপনার টোকেন নম্বর #${token} সফলভাবে বুক করা হয়েছে!`,
    download_pass_btn: "📄 পাস পিডিএফ ডাউনলোড করুন",
    go_dashboard_btn: "📊 ড্যাশবোর্ডে যান",
    booking_failed: (msg) => `❌ বুকিং ব্যর্থ হয়েছে: ${msg}`,
    try_again_btn: "পুনরায় চেষ্টা করুন",
    no_active_token: "আপনার বর্তমানে কোনো সক্রিয় ক্রয়ের টোকেন নেই।",
    book_now_btn: "📅 নতুন টোকেন বুক করুন",
    live_status_title: (token) => `আপনার সক্রিয় টোকেন #${token}-এর বর্তমান অবস্থা নিচে দেওয়া হলো:`,
    check_status_err: "অবস্থা পরীক্ষা করতে ত্রুটি হয়েছে।",
    no_active_to_cancel: "আপনার পুনর্নির্ধারণ বা বাতিল করার মতো কোনো সক্রিয় বুকিং নেই।",
    window_closed: (token, hours) => `⚠️ টোকেন #${token}-এর সময়সীমা সমাপ্ত হয়েছে।\n\nডিপো নীতি অনুসারে, ${hours} ঘণ্টার মধ্যে বুকিং পরিবর্তন বা বাতিল করা যাবে না।`,
    reschedule_prompt: (token, crop, qty, centre) => `টোকেন #${token} (${crop}, ${qty}kg, ডিপো: ${centre}) নিয়ে আপনি কী করতে চান?`,
    cancel_booking_btn: "❌ বুকিং বাতিল করুন",
    reschedule_new_date_btn: "📅 নতুন তারিখ নির্বাচন করুন",
    cancel_success: (token) => `✅ টোকেন #${token} সফলভাবে বাতিল করা হয়েছে।`,
    cancel_failed: (msg) => `⚠️ টোকেন বাতিল করা যায়নি: ${msg}`,
    msp_title: "সরকার ঘোষিত ন্যূনতম সহায়ক মূল্য (MSP) নিচে দেওয়া হলো:",
    msp_failed: "এমএসপি দর লোড করা সম্ভব হয়নি।",
    no_history_found: "আপনার কোনো পূর্ববর্তী ক্রয়ের ইতিহাস পাওয়া যায়নি।",
    no_completed_history: "কোনো সম্পন্ন ক্রয়ের রেকর্ড উপলব্ধ নেই।",
    history_title: (count) => `আপনার পূর্ববর্তী ${count}টি সম্পন্ন ক্রয়ের রেকর্ড নিচে দেওয়া হলো:`,
    history_failed: "ইতিহাস লোড করা সম্ভব হয়নি।",
    auto_recommend_centre: (c, b) => `📍 আপনার সবচেয়ে কাছের ক্রয় কেন্দ্র হলো **${c}** (${b})। আপনি কি এখানে আপনার ফসল বিক্রয়ের টোকেন বুক করতে চান? ১ বলুন বা 'হ্যাঁ' চাপুন, অথবা অন্য কেন্দ্রের জন্য ২ বলুন।`,
    auto_yes_btn: (c) => `1️⃣ ✅ হ্যাঁ, ${c}-এ বুক করুন`,
    choose_other_btn: "2️⃣ 🔍 অন্য ডিপো বেছে নিন / খুঁজুন",
    ask_location_permission: "📍 আপনার নিকটতম ক্রয় কেন্দ্র খুঁজে বের করতে আমি কি আপনার লোকেশন ব্যবহার করতে পারি?\n\n১ বলুন বা 'হ্যাঁ' চাপুন, অথবা নিজে ব্লক বেছে নিতে ২ বলুন।",
    allow_location_btn: "1️⃣ 📍 হ্যাঁ, লোকেশন ব্যবহার করুন",
    manual_location_btn: "2️⃣ 🗺️ নিজে ব্লক নির্বাচন করুন",
    loc_detecting: "📍 আপনার লোকেশন খোঁজা হচ্ছে...",
    loc_failed_fallback: "লোকেশন পাওয়া যায়নি। ব্লক অনুযায়ী সমস্ত ক্রয় কেন্দ্র দেখানো হচ্ছে।",
    nearest_centre_found: (c, d, b) => `📍 আপনার সবচেয়ে কাছের ক্রয় কেন্দ্র হলো **${c}** ${d !== undefined ? `(${d.toFixed(1)} কিমি দূরে, ${b})` : `(${b})`}। আপনি কি এখানে আপনার ফসল বিক্রয়ের টোকেন বুক করতে চান? ১ বলুন বা 'হ্যাঁ' চাপুন, অথবা অন্য কেন্দ্রের জন্য ২ বলুন।`
  },
  mr: {
    login_required: "टोकन बुक करण्यासाठी कृपया प्रथम लॉगिन करा.",
    login_btn: "🔑 लॉगिन पेजवर जा",
    active_token_exist: (token, centre, crop, qty, date) => `⚠️ तुमच्याकडे आधीपासूनच ${centre} येथे सक्रिय टोकन #${token} (${crop}, ${qty}kg, तारीख: ${date}) उपलब्ध आहे.\n\nएका वेळी फक्त एकच सक्रिय टोकन ठेवता येते.`,
    view_status_btn: "🔍 टोकन स्थिती तपासा",
    resched_cancel_btn: "🔄 टोकन बदला / रद्द करा",
    main_menu_btn: "🏠 मुख्य मेनू",
    no_centres_avail: "क्षमस्व, सध्या कोणतेही खरेदी केंद्र उपलब्ध नाही.",
    step1_block: "टप्पा १: कृपया तुमचा ब्लॉक (क्षेत्र) निवडा जिथे शेत आहे:",
    all_centres_btn: "🌐 सर्व खरेदी केंद्र पहा",
    search_centre_btn: "🔍 नावाने केंद्र शोधा",
    no_centres_in_block: "या ब्लॉकमध्ये कोणतेही केंद्र उपलब्ध नाही. कृपया दुसरा ब्लॉक निवडा:",
    step2_centre: (block) => `टप्पा २: ${block} क्षेत्रातील तुमचे आवडते खरेदी केंद्र निवडा:`,
    capacity_label: "क्षमता",
    farmer_per_day: "शेतकरी/दिवस",
    load_crop_err: "पिकांची यादी लोड करताना त्रुटी.",
    max_limit: "कमाल मर्यादा",
    step3_crop: "टप्पा ३: तुम्हाला कोणते पीक विकायचे आहे? खालीलपैकी निवडा:",
    step4_qty: "टप्पा ४: तुम्ही किती वजन (किग्रामध्ये) जमा करू इच्छिता? पर्याय निवडा:",
    select_centre_first: "कृपया प्रथम खरेदी केंद्र निवडा.",
    select_centre_btn: "🏢 केंद्र निवडा",
    booked_count_label: "बुक केलेले",
    step5_date: "टप्पा ५: तुमच्या सोयीनुसार विक्रीची तारीख निवडा:",
    load_date_err: (msg) => `तारीख लोड करताना त्रुटी: ${msg}`,
    retry_btn: " पुन्हा प्रयत्न करा",
    invalid_booking_selection: "बुकिंग माहिती अमान्य आहे. कृपया पुन्हा प्रयत्न करा.",
    restart_booking_btn: "🔄 पुन्हा सुरू करा",
    booking_success_title: (name, token) => `🎉 अभिनंदन ${name}! तुमचा टोकन क्रमांक #${token} यशस्वीरित्या बुक झाला आहे!`,
    download_pass_btn: "📄 पास पीडीएफ डाउनलोड करा",
    go_dashboard_btn: "📊 डॅशबोर्डवर जा",
    booking_failed: (msg) => `❌ बुकिंग अयशस्वी: ${msg}`,
    try_again_btn: "पुन्हा प्रयत्न करा",
    no_active_token: "तुमच्याकडे सध्या कोणतेही सक्रिय टोकन नाही.",
    book_now_btn: "📅 नवीन टोकन बुक करा",
    live_status_title: (token) => `तुमच्या सक्रिय टोकन #${token} ची सद्य स्थिती खाली दिली आहे:`,
    check_status_err: "स्थिती तपासताना त्रुटी आली.",
    no_active_to_cancel: "तुमच्याकडे रद्द करण्यासाठी किंवा बदलण्यासाठी कोणतीही सक्रिय बुकिंग नाही.",
    window_closed: (token, hours) => `⚠️ टोकन #${token} साठी बदल करण्याची मुदत संपली आहे.\n\nनियमांनुसार, ${hours} तासांच्या आत बुकिंग रद्द किंवा रीशेड्यूल करता येत नाही.`,
    reschedule_prompt: (token, crop, qty, centre) => `टोकन #${token} (${crop}, ${qty}kg, केंद्र: ${centre}) बद्दल तुम्ही काय करू इच्छिता?`,
    cancel_booking_btn: "❌ बुकिंग रद्द करा",
    reschedule_new_date_btn: "📅 नवीन तारीख निवडा (रीशेड्यूल)",
    cancel_success: (token) => `✅ टोकन #${token} यशस्वीरित्या रद्द करण्यात आले आहे.`,
    cancel_failed: (msg) => `⚠️ टोकन रद्द करता आले नाही: ${msg}`,
    msp_title: "शासनाने जाहीर केलेले किमान आधारभूत भाव (MSP) खालीलप्रमाणे:",
    msp_failed: "एमएसपी दर लोड होऊ शकले नाहीत.",
    no_history_found: "तुमचा कोणताही मागील खरेदी इतिहास आढळला नाही.",
    no_completed_history: "कोणतीही पूर्ण खरेदी नोंद उपलब्ध नाही.",
    history_title: (count) => `तुमच्या मागील ${count} पूर्ण खरेदी नोंदी खालीलप्रमाणे आहेत:`,
    history_failed: "इतिहास लोड करता आला नाही.",
    auto_recommend_centre: (c, b) => `📍 तुमच्या सर्वात जवळचे खरेदी केंद्र **${c}** (${b}) आहे. तुम्हाला येथे शेतमाल विक्रीसाठी टोकन बुक करायचे आहे का? १ बोला किंवा 'होय' दाबा, किंवा इतर केंद्रांसाठी २ बोला.`,
    auto_yes_btn: (c) => `1️⃣ ✅ होय, ${c} येथे बुक करा`,
    choose_other_btn: "2️⃣ 🔍 दुसरी खरेदी केंद्र निवडा / शोधा",
    ask_location_permission: "📍 तुमच्या जवळील खरेदी केंद्र शोधण्यासाठी मी तुमच्या लोकेशनचा वापर करू शकतो का?\n\n१ बोला किंवा 'होय' दाबा, किंवा ब्लॉक निवडण्यासाठी २ बोला.",
    allow_location_btn: "1️⃣ 📍 होय, लोकेशन वापरा",
    manual_location_btn: "2️⃣ 🗺️ स्वतः ब्लॉक निवडा",
    loc_detecting: "📍 तुमचे लोकेशन शोधले जात आहे...",
    loc_failed_fallback: "लोकेशन मिळू शकले नाही. ब्लॉकनुसार सर्व खरेदी केंद्र दाखवले जात आहेत.",
    nearest_centre_found: (c, d, b) => `📍 तुमच्या सर्वात जवळचे खरेदी केंद्र **${c}** ${d !== undefined ? `(${d.toFixed(1)} किमी अंतरावर, ${b})` : `(${b})`} आहे. तुम्हाला येथे टोकन बुक करायचे आहे का? १ बोला किंवा 'होय' दाबा, किंवा इतर केंद्रांसाठी २ बोला।`
  },
  te: {
    login_required: "టోకెన్ బుక్ చేసుకోవడానికి దయచేసి ముందుగా లాగిన్ చేయండి.",
    login_btn: "🔑 లాగిన్ పేజీకి వెళ్లండి",
    active_token_exist: (token, centre, crop, qty, date) => `⚠️ మీ వద్ద ఇప్పటికే ${centre} వద్ద సక్రియ టోకెన్ #${token} (${crop}, ${qty}kg, తేదీ: ${date}) ఉంది.\n\ ఒకేసారి ఒక సక్రియ టోకెన్ మాత్రమే ఉంచుకోవచ్చు.`,
    view_status_btn: "🔍 బుకింగ్ స్థితిని చూడండి",
    resched_cancel_btn: "🔄 టోకెన్ మార్చండి / రద్దు చేయండి",
    main_menu_btn: "🏠 ప్రధాన మెనూ",
    no_centres_avail: "క్షమించండి, ప్రస్తుతం కొనుగోలు కేంద్రాలు అందుబాటులో లేవు.",
    step1_block: "దశ 1: మీ పొలం ఉన్న బ్లాక్ (ప్రాంతం) ని ఎంచుకోండి:",
    all_centres_btn: "🌐 అన్ని కేంద్రాలను చూడండి",
    search_centre_btn: "🔍 పేరు ద్వారా కేంద్రాన్ని శోధించండి",
    no_centres_in_block: "ఈ బ్లాక్‌లో కొనుగోలు కేంద్రాలు లేవు. దయచేసి మరొకటి ఎంచుకోండి:",
    step2_centre: (block) => `దశ 2: ${block} ప్రాంతంలో మీ ప్రాధాన్య కొనుగోలు కేంద్రాన్ని ఎంచుకోండి:`,
    capacity_label: "సామర్థ్యం",
    farmer_per_day: "రైతులు/రోజు",
    load_crop_err: "పంటల వివరాలు లోడ్ చేయడంలో లోపం.",
    max_limit: "గరిష్ట పరిమితి",
    step3_crop: "దశ 3: మీరు ఏ పంటను విక్రయించాలనుకుంటున్నారు? కింద ఎంచుకోండి:",
    step4_qty: "దశ 4: మీరు అందించాలనుకుంటున్న పరిమాణాన్ని (కిలోలలో) ఎంచుకోండి:",
    select_centre_first: "దయచేసి ముందుగా మీ కొనుగోలు కేంద్రాన్ని ఎంచుకోండి.",
    select_centre_btn: "🏢 కేంద్రం ఎంచుకోండి",
    booked_count_label: "బుక్ చేయబడినవి",
    step5_date: "దశ 5: మీకు అనుకూలమైన తేదీని ఎంచుకోండి:",
    load_date_err: (msg) => `తేదీ లోడ్ చేయడంలో లోపం: ${msg}`,
    retry_btn: "🔄 మళ్లీ ప్రయత్నించండి",
    invalid_booking_selection: "బుకింగ్ సమాచారం చెల్లదు. దయచేసి మళ్లీ ప్రయత్నించండి.",
    restart_booking_btn: "🔄 మళ్లీ ప్రారంభించండి",
    booking_success_title: (name, token) => `🎉 అభినందనలు ${name}! మీ టోకెన్ సంఖ్య #${token} విజయవంతంగా బుక్ చేయబడింది!`,
    download_pass_btn: "📄 పాస్ PDF డౌన్‌లోడ్ చేయండి",
    go_dashboard_btn: "📊 డాష్‌బోర్డ్‌కు వెళ్లండి",
    booking_failed: (msg) => `❌ బుకింగ్ విఫలమైంది: ${msg}`,
    try_again_btn: "మళ్లీ ప్రయత్నించండి",
    no_active_token: "మీ వద్ద ప్రస్తుతం ఎటువంటి సక్రియ కొనుగోలు టోకెన్ లేదు.",
    book_now_btn: "📅 కొత్త టోకెన్ బుక్ చేయండి",
    live_status_title: (token) => `మీ సక్రియ టోకెన్ #${token} యొక్క ప్రత్యక్ష స్థితి కింద ఇవ్వబడింది:`,
    check_status_err: "స్థితి తనిఖీ చేయడంలో లోపం సంభవించింది.",
    no_active_to_cancel: "మీ వద్ద రద్దు చేయడానికి లేదా రీషెడ్యూల్ చేయడానికి తగిన సక్రియ బుకింగ్ లేదు.",
    window_closed: (token, hours) => `⚠️ టోకెన్ #${token} సవరణ సమయం ముగిసింది.\n\nపాలసీ ప్రకారం, ${hours} గంటల వ్యవధిలో బుకింగ్‌ను రద్దు చేయడం లేదా రీషెడ్యూల్ చేయడం సాధ్యపడదు.`,
    reschedule_prompt: (token, crop, qty, centre) => `టోకెన్ #${token} (${crop}, ${qty}kg, కేంద్రం: ${centre}) కి సంబంధించి మీరు ఏమి చేయాలనుకుంటున్నారు?`,
    cancel_booking_btn: "❌ బుకింగ్ రద్దు చేయండి",
    reschedule_new_date_btn: "📅 కొత్త తేదీని ఎంచుకోండి",
    cancel_success: (token) => `✅ టోకెన్ #${token} విజయవంతంగా రద్దు చేయబడింది.`,
    cancel_failed: (msg) => `⚠️ టోకెన్ రద్దు చేయలేకపోయాము: ${msg}`,
    msp_title: "ప్రభుత్వం ప్రకటించిన మద్దతు ధరలు (MSP) కింద ఇవ్వబడ్డాయి:",
    msp_failed: "MSP ధరలను పొందడం విఫలమైంది.",
    no_history_found: "మీ గత కొనుగోలు చరిత్ర ఏదీ కనుగొనబడలేదు.",
    no_completed_history: "పూర్తయిన కొనుగోలు రికార్డులు ఏవీ లేవు.",
    history_title: (count) => `మీ గత ${count} పూర్తయిన కొనుగోలు రికార్డులు కింద ఇవ్వబడ్డాయి:`,
    history_failed: "చరిత్రను లోడ్ చేయడం విఫలమైంది.",
    auto_recommend_centre: (c, b) => `📍 మీకు అత్యంత దగ్గరలోని కొనుగోలు కేంద్రం **${c}** (${b}). మీరు ఇక్కడ పంట విక్రయ టోకెన్ బుక్ చేయాలనుకుంటున్నారా? 1 అని చెప్పండి లేదా 'అవును' నొక్కండి.`,
    auto_yes_btn: (c) => `1️⃣ ✅ అవును, ${c} వద్ద బుక్ చేయండి`,
    choose_other_btn: "2️⃣ 🔍 మరొక కేంద్రం ఎంచుకోండి / శోధించండి",
    ask_location_permission: "📍 మీ సమీప కొనుగోలు కేంద్రాన్ని కనుగొనడానికి నేను మీ స్థానాన్ని (Location) ఉపయోగించవచ్చా?\n\n1 చెప్పండి లేదా 'అవును' నొక్కండి, లేదా 2 చెప్పండి.",
    allow_location_btn: "1️⃣ 📍 అవును, నా స్థానాన్ని ఉపయోగించండి",
    manual_location_btn: "2️⃣ 🗺️ మాన్యువల్‌గా బ్లాక్‌ను ఎంచుకోండి",
    loc_detecting: "📍 మీ స్థానాన్ని గుర్తిస్తోంది...",
    loc_failed_fallback: "స్థానం లభించలేదు. బ్లాక్ వారీగా అందుబాటులో ఉన్న కేంద్రాలు చూపిస్తున్నాము.",
    nearest_centre_found: (c, d, b) => `📍 మీకు అత్యంత దగ్గరలోని కొనుగోలు కేంద్రం **${c}** ${d !== undefined ? `(${d.toFixed(1)} కి.మీ దూరంలో, ${b})` : `(${b})`}. మీరు ఇక్కడ పంట విక్రయ టోకెన్ బుక్ చేయాలనుకుంటున్నారా? 1 అని చెప్పండి లేదా 'అవును' నొక్కండి.`
  },
  ta: {
    login_required: "டோக்கன் பதிவு செய்ய தயவுசெய்து முதலில் லாகின் செய்யவும்.",
    login_btn: "🔑 லாகின் பக்கத்திற்குச் செல்லவும்",
    active_token_exist: (token, centre, crop, qty, date) => `⚠️ உங்களிடம் ஏற்கனவே ${centre} இல் செயலில் உள்ள டோக்கன் #${token} (${crop}, ${qty}kg, தேதி: ${date}) உள்ளது.\n\nஒரு நேரத்தில் ஒரு செயலில் உள்ள டோக்கன் மட்டுமே இருக்க முடியும்.`,
    view_status_btn: "🔍 பதிவின் நிலையைக் காண்க",
    resched_cancel_btn: "🔄 டோக்கனை மாற்ற / ரத்து செய்ய",
    main_menu_btn: "🏠 முதன்மை மெனு",
    no_centres_avail: "மன்னிக்கவும், தற்போது கொள்முதல் மையங்கள் எதுவும் கிடைக்கவில்லை.",
    step1_block: "படி 1: உங்கள் பண்ணை அமைந்துள்ள தொகுதியைத் தேர்ந்தெடுக்கவும்:",
    all_centres_btn: "🌐 அனைத்து மையங்களையும் காண்க",
    search_centre_btn: "🔍 பெயர் மூலம் மையத்தைத் தேடுங்கள்",
    no_centres_in_block: "இந்தத் தொகுதியில் கொள்முதல் மையங்கள் எதுவும் இல்லை. வேறொன்றைத் தேர்ந்தெடுக்கவும்:",
    step2_centre: (block) => `படி 2: ${block} பகுதியில் உங்களுக்கு விருப்பமான கொள்முதல் மையத்தைத் தேர்ந்தெடுக்கவும்:`,
    capacity_label: "கொள்திறன்",
    farmer_per_day: "விவசாயிகள்/நாள்",
    load_crop_err: "பயிர்களின் பட்டியலை ஏற்றுவதில் பிழை.",
    max_limit: "அதிகபட்ச வரம்பு",
    step3_crop: "படி 3: நீங்கள் எந்தப் பயிரை விற்க விரும்புகிறீர்கள்? கீழே தேர்ந்தெடுக்கவும்:",
    step4_qty: "படி 4: நீங்கள் வழங்க விரும்பும் அளவை (கிலோவில்) தேர்ந்தெடுக்கவும்:",
    select_centre_first: "தயவுசெய்து முதலில் உங்கள் கொள்முதல் மையத்தைத் தேர்ந்தெடுக்கவும்.",
    select_centre_btn: "🏢 மையத்தைத் தேர்ந்தெடுக்கவும்",
    booked_count_label: "பதிவு செய்யப்பட்டது",
    step5_date: "படி 5: உங்களுக்கு வசதியான தேதியைத் தேர்ந்தெடுக்கவும்:",
    load_date_err: (msg) => `தேதிகளை ஏற்றுவதில் பிழை: ${msg}`,
    retry_btn: "🔄 மீண்டும் முயற்சிக்கவும்",
    invalid_booking_selection: "பதிவு விவரங்கள் தவறானவை. மீண்டும் முயற்சிக்கவும்.",
    restart_booking_btn: "🔄 மீண்டும் தொடங்கவும்",
    booking_success_title: (name, token) => `🎉 வாழ்த்துகள் ${name}! உங்கள் டோக்கன் எண் #${token} வெற்றிகரமாக பதிவு செய்யப்பட்டது!`,
    download_pass_btn: "📄 பாஸ் PDF பதிவிறக்கவும்",
    go_dashboard_btn: "📊 டேஷ்போர்டிற்குச் செல்லவும்",
    booking_failed: (msg) => `❌ பதிவு தோல்வியடைந்தது: ${msg}`,
    try_again_btn: "மீண்டும் முயற்சிக்கவும்",
    no_active_token: "உங்களிடம் தற்போது செயலில் உள்ள டோக்கன் எதுவும் இல்லை.",
    book_now_btn: "📅 புதிய டோக்கன் பதிவு செய்க",
    live_status_title: (token) => `உங்கள் செயலில் உள்ள டோக்கன் #${token} இன் தற்போதைய நிலை கீழே ఇవ్వப்பட்டுள்ளது:`,
    check_status_err: "நிலையைச் சரிபார்ப்பதில் பிழை ஏற்பட்டது.",
    no_active_to_cancel: "உங்களிடம் ரத்து செய்ய அல்லது மாற்றி அமைக்க தகுதியான பதிவு எதுவும் இல்லை.",
    window_closed: (token, hours) => `⚠️ டோக்கன் #${token} க்கான திருத்த காலம் முடிவடைந்தது.\n\nவிதிகளின்படி, ${hours} மணி நேரத்திற்குள் பதிவை ரத்து செய்யவோ மாற்றவோ முடியாது.`,
    reschedule_prompt: (token, crop, qty, centre) => `டோக்கன் #${token} (${crop}, ${qty}kg, மையம்: ${centre}) தொடர்பாக நீங்கள் என்ன செய்ய விரும்புகிறீர்கள்?`,
    cancel_booking_btn: "❌ பதிவை ரத்து செய்க",
    reschedule_new_date_btn: "📅 புதிய தேதியைத் தேர்ந்தெடுக்கவும்",
    cancel_success: (token) => `✅ டோக்கன் #${token} வெற்றிகரமாக ரத்து செய்யப்பட்டது.`,
    cancel_failed: (msg) => `⚠️ டோக்கனை ரத்து செய்ய முடியவில்லை: ${msg}`,
    msp_title: "அரசாங்கம் அறிவித்த குறைந்தபட்ச ஆதரவு விலை (MSP) விவரங்கள்:",
    msp_failed: "MSP விலைகளைப் பெற முடியவில்லை.",
    no_history_found: "உங்கள் முந்தைய கொள்முதல் வரலாறு எதுவும் காணப்படவில்லை.",
    no_completed_history: "முழுமையான கொள்முதல் பதிவுகள் எதுவும் இல்லை.",
    history_title: (count) => `உங்கள் முந்தைய ${count} கொள்முதல் பதிவுகள் கீழே கொடுக்கப்பட்டுள்ளன:`,
    history_failed: "வரலாற்றை ஏற்றுவதில் பிழை.",
    auto_recommend_centre: (c, b) => `📍 உங்களுக்கு மிக அருகிலுள்ள கொள்முதல் மையம் **${c}** (${b}). இங்கே பயிர் விற்பனை டோக்கன் பதிவு செய்ய விரும்புகிறீர்களா? 1 என்று சொல்லுங்கள் அல்லது 'ஆம்' என்பதை அழுத்தவும்.`,
    auto_yes_btn: (c) => `1️⃣ ✅ ஆம், ${c} இல் பதிவு செய்`,
    choose_other_btn: "2️⃣ 🔍 வேறு மையம் தேர்ந்தெடுக்கவும்",
    ask_location_permission: "📍 உங்கள் அருகில் உள்ள கொள்முதல் மையத்தைக் கண்டறிய உங்கள் இருப்பிடத்தைப் பயன்படுத்தலாமா?\n\n1 சொல்லுங்கள் அல்லது 'ஆம்' அழுத்தவும், அல்லது 2 சொல்லுங்கள்.",
    allow_location_btn: "1️⃣ 📍 ஆம், என் இருப்பிடத்தைப் பயன்படுத்து",
    manual_location_btn: "2️⃣ 🗺️ தொகுதியைத் தேர்ந்தெடுக்கவும்",
    loc_detecting: "📍 உங்கள் இருப்பிடத்தைக் கண்டறிகிறது...",
    loc_failed_fallback: "இருப்பிடத்தைப் பெற முடியவில்லை. தொகுதி வாரியாக மையங்கள் காட்டப்படுகின்றன.",
    nearest_centre_found: (c, d, b) => `📍 உங்களுக்கு மிக அருகிலுள்ள கொள்முதல் மையம் **${c}** ${d !== undefined ? `(${d.toFixed(1)} கி.மீ தொலைவில், ${b})` : `(${b})`}. இங்கே பயிர் விற்பனை டோக்கன் பதிவு செய்ய விரும்புகிறீர்களா? 1 என்று சொல்லுங்கள் அல்லது 'ஆம்' என்பதை அழுத்தவும்.`
  },
  pa: {
    login_required: "ਟੋਕਨ ਬੁੱਕ ਕਰਨ ਲਈ ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਲੌਗਇਨ ਕਰੋ।",
    login_btn: "🔑 ਲੌਗਇਨ ਪੇਜ 'ਤੇ ਜਾਓ",
    active_token_exist: (token, centre, crop, qty, date) => `⚠️ ਤੁਹਾਡੇ ਕੋਲ ਪਹਿਲਾਂ ਹੀ ${centre} 'ਤੇ ਇੱਕ ਸਰਗਰਮ ਟੋਕਨ #${token} (${crop}, ${qty}kg, ਮਿਤੀ: ${date}) ਮੌਜੂਦ ਹੈ।\n\nਇੱਕ ਸਮੇਂ ਵਿੱਚ ਕੇਵਲ ਇੱਕ ਹੀ ਸਰਗਰਮ ਟੋਕਨ ਰੱਖਿਆ ਜਾ ਸਕਦਾ ਹੈ।`,
    view_status_btn: "🔍 ਬੁਕਿੰਗ ਦੀ ਸਥਿਤੀ ਦੇਖੋ",
    resched_cancel_btn: "🔄 ਟੋਕਨ ਬਦਲੋ / ਰੱਦ ਕਰੋ",
    main_menu_btn: "🏠 ਮੁੱਖ ਮੇਨੂ",
    no_centres_avail: "ਮੁਆਫ਼ ਕਰਨਾ, ਵਰਤਮਾਨ ਵਿੱਚ ਕੋਈ ਖਰੀਦ ਕੇਂਦਰ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।",
    step1_block: "ਕਦਮ 1: ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਬਲਾਕ (ਖੇਤਰ) ਚੁਣੋ ਜਿੱਥੇ ਤੁਹਾਡੀ ਫ਼ਸਲ ਹੈ:",
    all_centres_btn: "🌐 ਸਾਰੇ ਕੇਂਦਰ ਦੇਖੋ",
    search_centre_btn: "🔍 ਨਾਮ ਦੁਆਰਾ ਕੇਂਦਰ ਲੱਭੋ",
    no_centres_in_block: "ਇਸ ਬਲਾਕ ਵਿੱਚ ਕੋਈ ਖਰੀਦ ਕੇਂਦਰ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਦੂਜਾ ਬਲਾਕ ਚੁਣੋ:",
    step2_centre: (block) => `ਕਦਮ 2: ${block} ਖੇਤਰ ਵਿੱਚ ਆਪਣਾ ਪਸੰਦੀਦਾ ਖਰੀਦ ਕੇਂਦਰ ਚੁਣੋ:`,
    capacity_label: "ਸਮਰੱਥਾ",
    farmer_per_day: "ਕਿਸਾਨ/ਦਿਨ",
    load_crop_err: "ਫ਼ਸਲ ਸੂਚੀ ਲੋਡ ਕਰਨ ਵਿੱਚ ਤਰੁੱਟੀ।",
    max_limit: "ਵੱਧ ਤੋਂ ਵੱਧ ਸੀਮਾ",
    step3_crop: "ਕਦਮ 3: ਤੁਸੀਂ ਕਿਹੜੀ ਫ਼ਸਲ ਵੇਚਣਾ ਚਾਹੁੰਦੇ ਹੋ? ਹੇਠਾਂ ਤੋਂ ਚੁਣੋ:",
    step4_qty: "ਕਦਮ 4: ਤੁਸੀਂ ਕਿੰਨਾ ਵਜ਼ਨ (ਕਿਲੋ ਵਿੱਚ) ਦੇਣਾ ਚਾਹੁੰਦੇ ਹੋ? ਚੁਣੋ:",
    select_centre_first: "ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਆਪਣਾ ਖਰੀਦ ਕੇਂਦਰ ਚੁਣੋ।",
    select_centre_btn: "🏢 ਕੇਂਦਰ ਚੁਣੋ",
    booked_count_label: "ਬੁੱਕ ਕੀਤੇ",
    step5_date: "ਕਦਮ 5: ਆਪਣੀ ਸਹੂਲਤ ਅਨੁਸਾਰ ਮਿਤੀ ਚੁਣੋ:",
    load_date_err: (msg) => `ਮਿਤੀ ਲੋਡ ਕਰਨ ਵਿੱਚ ਤਰੁੱਟੀ: ${msg}`,
    retry_btn: "🔄 ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ",
    invalid_booking_selection: "ਬੁਕਿੰਗ ਜਾਣਕਾਰੀ ਅਵੈਧ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
    restart_booking_btn: "🔄 ਮੁੜ ਸ਼ੁਰੂ ਕਰੋ",
    booking_success_title: (name, token) => `🎉 ਵਧਾਈ ਹੋਵੇ ${name}! ਤੁਹਾਡਾ ਟੋਕਨ ਨੰਬਰ #${token} ਸਫਲਤਾਪੂਰਵਕ ਬੁੱਕ ਹੋ ਗਿਆ ਹੈ!`,
    download_pass_btn: "📄 ਪਾਸ PDF ਡਾਊਨਲੋਡ ਕਰੋ",
    go_dashboard_btn: "📊 ਡੈਸ਼ਬੋਰਡ 'ਤੇ ਜਾਓ",
    booking_failed: (msg) => `❌ ਬੁਕਿੰਗ ਅਸਫਲ: ${msg}`,
    try_again_btn: "ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ",
    no_active_token: "ਤੁਹਾਡੇ ਕੋਲ ਵਰਤਮਾਨ ਵਿੱਚ ਕੋਈ ਸਰਗਰਮ ਟੋਕਨ ਨਹੀਂ ਹੈ।",
    book_now_btn: "📅 ਨਵਾਂ ਟੋਕਨ ਬੁੱਕ ਕਰੋ",
    live_status_title: (token) => `ਤੁਹਾਡੇ ਸਰਗਰਮ ਟੋਕਨ #${token} ਦੀ ਵਰਤਮਾਨ ਸਥਿਤੀ ਹੇਠਾਂ ਦਿੱਤੀ ਗਈ ਹੈ:`,
    check_status_err: "ਸਥਿਤੀ ਚੈੱਕ ਕਰਨ ਵਿੱਚ ਤਰੁੱਟੀ ਆਈ।",
    no_active_to_cancel: "ਤੁਹਾਡੇ ਕੋਲ ਰੱਦ ਕਰਨ ਜਾਂ ਬਦਲਣ ਲਈ ਕੋਈ ਯੋਗ ਸਰਗਰਮ ਬੁਕਿੰਗ ਨਹੀਂ ਹੈ।",
    window_closed: (token, hours) => `⚠️ ਟੋਕਨ #${token} ਦੀ ਬਦਲਾਅ ਦੀ ਸਮਾਂ ਸੀਮਾ ਲੰਘ ਚੁੱਕੀ ਹੈ।\n\nਨਿਯਮਾਂ ਅਨੁਸਾਰ ${hours} ਘੰਟਿਆਂ ਦੇ ਅੰਦਰ ਬੁਕਿੰਗ ਰੱਦ ਜਾਂ ਰੀਸ਼ੈਡਿਊਲ ਨਹੀਂ ਕੀਤੀ ਜਾ ਸਕਦੀ।`,
    reschedule_prompt: (token, crop, qty, centre) => `ਟੋਕਨ #${token} (${crop}, ${qty}kg, ਕੇਂਦਰ: ${centre}) ਲਈ ਤੁਸੀਂ ਕੀ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?`,
    cancel_booking_btn: "❌ ਬੁਕਿੰਗ ਰੱਦ ਕਰੋ",
    reschedule_new_date_btn: "📅 ਨਵੀਂ ਮਿਤੀ ਚੁਣੋ (ਰੀਸ਼ੈਡਿਊਲ)",
    cancel_success: (token) => `✅ ਟੋਕਨ #${token} ਸਫਲਤਾਪੂਰਵਕ ਰੱਦ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ।`,
    cancel_failed: (msg) => `⚠️ ਟੋਕਨ ਰੱਦ ਨਹੀਂ ਕੀਤਾ ਜਾ ਸਕਿਆ: ${msg}`,
    msp_title: "ਸਰਕਾਰ ਵੱਲੋਂ ਐਲਾਨੇ ਘੱਟੋ-ਘੱਟ ਸਮਰਥਨ ਮੁੱਲ (MSP) ਹੇਠਾਂ ਦਿੱਤੇ ਗਏ ਹਨ:",
    msp_failed: "ਐਮਐਸਪੀ ਰੇਟ ਲੋਡ ਨਹੀਂ ਹੋ ਸਕੇ।",
    no_history_found: "ਤੁਹਾਡਾ ਕੋਈ ਪੁਰਾਣਾ ਖਰੀਦ ਇਤਿਹਾਸ ਨਹੀਂ ਮਿਲਿਆ।",
    no_completed_history: "ਕੋਈ ਮੁਕੰਮਲ ਖਰੀਦ ਰਿਕਾਰਡ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।",
    history_title: (count) => `ਤੁਹਾਡੇ ਪਿਛਲੇ ${count} ਖਰੀਦ ਰਿਕਾਰਡ ਹੇਠਾਂ ਦਿੱਤੇ ਗਏ ਹਨ:`,
    history_failed: "ਇਤਿਹਾਸ ਲੋਡ ਨਹੀਂ ਹੋ ਸਕਿਆ।",
    auto_recommend_centre: (c, b) => `📍 ਤੁਹਾਡੇ ਸਭ ਤੋਂ ਨੇੜਲਾ ਖਰੀਦ ਕੇਂਦਰ **${c}** (${b}) ਹੈ। ਕੀ ਤੁਸੀਂ ਆਪਣੀ ਫ਼ਸਲ ਵੇਚਣ ਲਈ ਇੱਥੇ ਟੋਕਨ ਬੁੱਕ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ? 1 ਬੋਲੋ ਜਾਂ 'ਹਾਂ' ਦਬਾਓ।`,
    auto_yes_btn: (c) => `1️⃣ ✅ ਹਾਂ, ${c} 'ਤੇ ਬੁੱਕ ਕਰੋ`,
    choose_other_btn: "2️⃣ 🔍 ਦੂਜੀ ਮੰਡੀ ਚੁਣੋ / ਲੱਭੋ",
    ask_location_permission: "📍 ਤੁਹਾਡੇ ਸਭ ਤੋਂ ਨੇੜਲੇ ਖਰੀਦ ਕੇਂਦਰ ਦੀ ਭਾਲ ਕਰਨ ਲਈ ਕੀ ਮੈਂ ਤੁਹਾਡੀ ਲੋਕੇਸ਼ਨ ਦੀ ਵਰਤੋਂ ਕਰ ਸਕਦਾ ਹਾਂ?\n\n1 ਬੋਲੋ ਜਾਂ 'ਹਾਂ' ਦਬਾਓ, ਜਾਂ 2 ਬੋਲੋ।",
    allow_location_btn: "1️⃣ 📍 ਹਾਂ, ਲੋਕੇਸ਼ਨ ਦੀ ਵਰਤੋਂ ਕਰੋ",
    manual_location_btn: "2️⃣ 🗺️ ਆਪ ਬਲਾਕ ਚੁਣੋ",
    loc_detecting: "📍 ਤੁਹਾਡੀ ਲੋਕੇਸ਼ਨ ਦੀ ਭਾਲ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ...",
    loc_failed_fallback: "ਲੋਕੇਸ਼ਨ ਨਹੀਂ ਮਿਲ ਸਕੀ। ਬਲਾਕ ਅਨੁਸਾਰ ਸਾਰੇ ਖਰੀਦ ਕੇਂਦਰ ਦਿਖਾਏ ਜਾ ਰਹੇ ਹਨ।",
    nearest_centre_found: (c, d, b) => `📍 ਤੁਹਾਡੇ ਸਭ ਤੋਂ ਨੇੜਲਾ ਖਰੀਦ ਕੇਂਦਰ **${c}** ${d !== undefined ? `(${d.toFixed(1)} ਕਿਲੋਮੀਟਰ ਦੂਰ, ${b})` : `(${b})`} ਹੈ। ਕੀ ਤੁਸੀਂ ਆਪਣੀ ਫ਼ਸਲ ਵੇਚਣ ਲਈ ਇੱਥੇ ਟੋਕਨ ਬੁੱਕ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ? 1 ਬੋਲੋ ਜਾਂ 'ਹਾਂ' ਦਬਾਓ।`
  }
};

const getKisaanFlowI18n = (lang: string) => {
  const langKey = (lang || 'hi').split('-')[0].toLowerCase();
  return KISAAN_FLOW_I18N[langKey] || KISAAN_FLOW_I18N['en'] || KISAAN_FLOW_I18N['hi'];
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const LOCALIZED_CROP_NAMES: Record<string, Record<string, string>> = {
  Wheat: { hi: 'गेहूँ (Wheat)', bn: 'গম (Wheat)', mr: 'गहू (Wheat)', te: 'గోధుమలు (Wheat)', ta: 'கோதுமை (Wheat)', pa: 'ਕਣਕ (Wheat)', en: 'Wheat' },
  Paddy: { hi: 'धान (Paddy)', bn: 'ধান (Paddy)', mr: 'तांदूळ / भात (Paddy)', te: 'వరి (Paddy)', ta: 'நெல் (Paddy)', pa: 'ਝੋਨਾ (Paddy)', en: 'Paddy' },
  Mustard: { hi: 'सरसों (Mustard)', bn: 'সরষে (Mustard)', mr: 'मोहरी (Mustard)', te: 'ఆవాలు (Mustard)', ta: 'கடுகு (Mustard)', pa: 'ਸਰ੍ਹੋਂ (Mustard)', en: 'Mustard' },
  Maize: { hi: 'मक्का (Maize)', bn: 'ভুট্টা (Maize)', mr: 'मक्का (Maize)', te: 'మక్కజొన్న (Maize)', ta: 'மக்காச்சோளம் (Maize)', pa: 'ਮੱਕੀ (Maize)', en: 'Maize' },
  Gram: { hi: 'चना (Gram)', bn: 'ছোলা (Gram)', mr: 'हरभरा (Gram)', te: 'శనగలు (Gram)', ta: 'கொண்டைக்கடலை (Gram)', pa: 'ਚਣਾ (Gram)', en: 'Gram' },
  Cotton: { hi: 'कपास (Cotton)', bn: 'তুলা (Cotton)', mr: 'कापूस (Cotton)', te: 'పత్తి (Cotton)', ta: 'பருத்தி (Cotton)', pa: 'ਕਪਾਹ (Cotton)', en: 'Cotton' }
};

const getLocalizedCropName = (cropName: string, lang: string) => {
  const langKey = (lang || 'hi').split('-')[0].toLowerCase();
  const map = LOCALIZED_CROP_NAMES[cropName];
  if (map && map[langKey]) return map[langKey];
  return cropName;
};

const LOCALIZED_QUINTALS: Record<string, string> = {
  hi: 'क्विंटल',
  bn: 'কুইন্টাল',
  mr: 'क्विंटल',
  te: 'క్వింటాళ్ళు',
  ta: 'குவிண்டால்',
  pa: 'ਕੁਇੰਟਲ',
  en: 'Quintals'
};

const getRelativeDateLabel = (_dateStr: string, index: number, lang: string) => {
  const langKey = (lang || 'hi').split('-')[0].toLowerCase();
  if (index === 0) {
    const todayMap: Record<string, string> = {
      hi: 'आज (Today)', bn: 'আজ (Today)', mr: 'आज (Today)', te: 'ఈరోజు (Today)', ta: 'இன்று (Today)', pa: 'ਅੱਜ (Today)', en: 'Today'
    };
    return todayMap[langKey] || 'Today';
  }
  if (index === 1) {
    const tomMap: Record<string, string> = {
      hi: 'कल (Tomorrow)', bn: 'আগামীকাল (Tomorrow)', mr: 'उद्या (Tomorrow)', te: 'రేపు (Tomorrow)', ta: 'நாளை (Tomorrow)', pa: 'ਕੱਲ੍ਹ (Tomorrow)', en: 'Tomorrow'
    };
    return tomMap[langKey] || 'Tomorrow';
  }
  if (index === 2) {
    const datMap: Record<string, string> = {
      hi: 'परसों (Day After)', bn: 'পরশু (Day After)', mr: 'परवा (Day After)', te: 'ఎల్లుండి (Day After)', ta: 'நாளை மறுநாள் (Day After)', pa: 'ਪਰਸੋਂ (Day After)', en: 'Day After'
    };
    return datMap[langKey] || 'Day After';
  }
  return '';
};

export const KisanAgentWidget: React.FC = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [, setLangTick] = useState(0);

  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [farmerName, setFarmerName] = useState('Kisan');
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);

  // Audio Speech Synthesis & Voice Recognition State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const prevLangRef = useRef<string>(i18n.language);

  // Booking Flow temporary state
  const [bookingState, setBookingState] = useState<{
    step: 'root' | 'location_permission' | 'state' | 'district' | 'block' | 'centre' | 'search_centre' | 'product' | 'qty' | 'date' | 'confirm';
    selectedStateCode?: number;
    selectedDistrictCode?: number;
    selectedBlockCode?: number;
    selectedCentre?: any;
    selectedProduct?: any;
    quantity?: number;
    selectedDate?: any;
    centresList?: any[];
    productsList?: any[];
    datesList?: any[];
  }>({ step: 'root' });

  // Fetch session & initialize Speech Recognition
  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('name')
          .eq('id', session.user.id)
          .maybeSingle();
        const detectedName = profile?.name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Kisan';
        if (detectedName) setFarmerName(detectedName);
      }
    };
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('name')
          .eq('id', session.user.id)
          .maybeSingle();
        const detectedName = profile?.name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Kisan';
        if (detectedName) setFarmerName(detectedName);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Subscribe directly to i18n languageChanged events to keep AI agent 100% in sync with website language
  useEffect(() => {
    const handleLanguageChange = (newLng: string) => {
      setLangTick((prev) => prev + 1);
      prevLangRef.current = newLng;
      stopSpeaking();
      setMessages([]);
      setBookingState({ step: 'root' });
      if (isOpen) {
        showRootMenu();
      }
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n, isOpen, farmerName]);

  // Monitor i18n language changes or farmerName update when opening widget
  useEffect(() => {
    if (isOpen) {
      if (prevLangRef.current !== i18n.language || messages.length === 0) {
        prevLangRef.current = i18n.language;
        stopSpeaking();
        setMessages([]);
        setBookingState({ step: 'root' });
        showRootMenu();
      }
    }
  }, [i18n.language, isOpen, farmerName]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Pre-fetch speech voices when mounted or when voices change
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
      return () => {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.onvoiceschanged = null;
        }
      };
    }
  }, []);

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Phonetic transliterator fallback when OS lacks a native Bengali/regional voice
  const convertToPhoneticText = (text: string, lang: string): string => {
    if (lang === 'bn') {
      return text
        .replace(/নমস্কার/g, 'Namaskar')
        .replace(/আমি/g, 'ami')
        .replace(/কিশান/g, 'Kisaan')
        .replace(/সাথী/g, 'Saathi')
        .replace(/আপনাকে/g, 'apnake')
        .replace(/কীভাবে/g, 'kibhabe')
        .replace(/সাহায্য/g, 'sahajya')
        .replace(/করতে/g, 'korte')
        .replace(/পারি/g, 'pari')
        .replace(/নিচের/g, 'nijer')
        .replace(/যেকোনো/g, 'jekono')
        .replace(/একটি/g, 'ekti')
        .replace(/অপশন/g, 'option')
        .replace(/বেছে/g, 'beche')
        .replace(/নিন/g, 'nin')
        .replace(/ধাপ/g, 'Dhap')
        .replace(/আপনার/g, 'apnar')
        .replace(/জমি/g, 'jomi')
        .replace(/যে/g, 'je')
        .replace(/ব্লকে/g, 'block-e')
        .replace(/অবস্থিত/g, 'obosthito')
        .replace(/তা/g, 'ta')
        .replace(/নির্বাচন/g, 'nirbachon')
        .replace(/করুন/g, 'korun')
        .replace(/এলাকায়/g, 'elakay')
        .replace(/পছন্দের/g, 'pochhonder')
        .replace(/ক্রয়/g, 'kroy')
        .replace(/কেন্দ্র/g, 'kendra')
        .replace(/কোন/g, 'kon')
        .replace(/ফসল/g, 'phosol')
        .replace(/বিক্রি/g, 'bikri')
        .replace(/চান/g, 'chan')
        .replace(/কত/g, 'koto')
        .replace(/পরিমাণ/g, 'poriman')
        .replace(/কেজিতে/g, 'kg-te')
        .replace(/সরবরাহ/g, 'sorboraho')
        .replace(/সুবিধাজনক/g, 'subidhajonok')
        .replace(/তারিখ/g, 'tarikh')
        .replace(/নতুন/g, 'notun')
        .replace(/টোকেন/g, 'token')
        .replace(/বুক/g, 'book')
        .replace(/অবস্থা/g, 'obostha')
        .replace(/দেখুন/g, 'dekhun')
        .replace(/ইতিহাস/g, 'itihas')
        .replace(/রশিদ/g, 'roshid')
        .replace(/এমএসপি/g, 'MSP');
    }
    if (lang === 'hi') {
      return text
        .replace(/नमस्ते/g, 'Namaste')
        .replace(/मैं/g, 'main')
        .replace(/किसान/g, 'Kisan')
        .replace(/साथी/g, 'Saathi')
        .replace(/सहायता/g, 'sahayata')
        .replace(/करूँ/g, 'karoon')
        .replace(/विकल्पों/g, 'vikalpon')
        .replace(/चुनें/g, 'chunen')
        .replace(/चरण/g, 'Charan')
        .replace(/खरीद/g, 'kharid')
        .replace(/केंद्र/g, 'kendra')
        .replace(/फसल/g, 'fasal')
        .replace(/बेचना/g, 'bechna')
        .replace(/चाहते/g, 'chahte')
        .replace(/मात्रा/g, 'matra')
        .replace(/तिथि/g, 'tithi');
    }
    return text;
  };

  // 100% Reliable Multilanguage Text to Speech Function (TTS) - Zero CORS / Zero Network Errors
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    stopSpeaking();

    const cleanText = text
      .replace(/[*#_`🤖📅🔍🔄🌾📜🔊📄📊🔑✅❌⚠️📍🏢🌐🗺️]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    const rawLang = (i18n.language || 'hi').toLowerCase();
    const shortLang = rawLang.split('-')[0];
    const targetBcp47 = BCP47_LANG_MAP[rawLang] || BCP47_LANG_MAP[shortLang] || 'hi-IN';

    // Check if browser has a matching native voice for target language
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find((v) => {
      const vLang = v.lang.toLowerCase().replace('_', '-');
      const vName = v.name.toLowerCase();
      return (
        vLang === targetBcp47.toLowerCase() ||
        vLang.startsWith(shortLang) ||
        (shortLang === 'bn' && (vName.includes('bengali') || vName.includes('bangla'))) ||
        (shortLang === 'hi' && (vName.includes('hindi') || vName.includes('हिन्दी'))) ||
        (shortLang === 'mr' && vName.includes('marathi')) ||
        (shortLang === 'te' && vName.includes('telugu')) ||
        (shortLang === 'ta' && vName.includes('tamil')) ||
        (shortLang === 'pa' && vName.includes('punjabi'))
      );
    });

    let textToAnnounce = cleanText;
    // If NO native voice for this language is installed on OS (e.g. Windows Chrome has only English voice),
    // convert Indic Unicode characters to clean phonetic text so the English voice reads the FULL sentence instead of skipping Bengali characters!
    if (!matchingVoice && shortLang !== 'en') {
      textToAnnounce = convertToPhoneticText(cleanText, shortLang);
    }

    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(textToAnnounce);
        utterance.lang = matchingVoice ? targetBcp47 : 'en-US';
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
        utterance.rate = 0.92;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (e) => {
          console.warn('Speech synthesis error:', e);
          setIsSpeaking(false);
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('Failed to execute speakText:', err);
        setIsSpeaking(false);
      }
    }, 50);
  };

  // Speech Recognition Function (STT) with Mic Permission & Real-Time Transcript
  const toggleListening = async () => {
    const rawLang = (i18n.language || 'hi').toLowerCase();
    const shortLang = rawLang.split('-')[0];
    const isHi = shortLang === 'hi';
    const targetBcp47 = BCP47_LANG_MAP[rawLang] || BCP47_LANG_MAP[shortLang] || 'hi-IN';

    // 1. Check HTTP/HTTPS security origin (SpeechRecognition in Chrome requires localhost or HTTPS)
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      addAgentMessage(
        isHi
          ? '⚠️ आवाज़ पहचान हेतु "http://localhost" या HTTPS कनेक्शन आवश्यक है। कृपया "http://localhost:5173" पर खोलें।'
          : '⚠️ Voice recognition requires "http://localhost" or HTTPS. Please open via "http://localhost:5173" or type your message.',
        undefined, undefined, undefined, false
      );
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addAgentMessage(
        isHi 
          ? '⚠️ आपका ब्राउज़र आवाज़ पहचानने (Speech Recognition) का समर्थन नहीं करता है। कृपया Chrome या Edge का उपयोग करें या नीचे लिखें।' 
          : '⚠️ Speech recognition is not supported in this browser. Please use Chrome or Edge, or type in the input box.',
        undefined, undefined, undefined, false
      );
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.error(e);
      }
      setIsListening(false);
      return;
    }

    // 2. Instantiate and start Speech Recognition directly
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      
      recognition.lang = targetBcp47;

      let accumulatedText = '';

      recognition.onstart = () => {
        setIsListening(true);
        stopSpeaking();
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item[0]?.transcript) {
            currentTranscript += item[0].transcript;
          }
        }
        if (currentTranscript.trim()) {
          accumulatedText = currentTranscript.trim();
          setInputVal(accumulatedText);
        }
      };

      recognition.onerror = (err: any) => {
        const errorType = err?.error || 'unknown';
        console.warn('Speech recognition error code:', errorType);
        setIsListening(false);

        if (errorType === 'no-speech' || errorType === 'aborted') {
          return;
        }

        if (errorType === 'network') {
          addAgentMessage(
            isHi 
              ? '🎙️ ब्राउज़र ऑनलाइन स्पीच सेवा से कनेक्ट नहीं हो सका। कृपया नीचे दिए गए विकल्पों में से चुनें या इनपुट बॉक्स में लिखें:' 
              : '🎙️ Browser speech cloud service unreachable. Please select a quick command below or type your query:',
            [
              {
                id: 'v_book',
                label: isHi ? '📅 नया टोकन बुक करें' : '📅 Book Appointment',
                action: () => startBookingFlow()
              },
              {
                id: 'v_status',
                label: isHi ? '🔍 बुकिंग स्थिति देखें' : '🔍 Check Booking Status',
                action: () => checkBookingStatus()
              },
              {
                id: 'v_msp',
                label: isHi ? '🌾 MSP रेट देखें' : '🌾 View MSP Rates',
                action: () => showMspRates()
              },
              {
                id: 'v_hist',
                label: isHi ? '📜 रसीਦ व इतिहास' : '📜 History & Receipt',
                action: () => showProcurementHistory()
              }
            ],
            undefined, undefined, false
          );
          return;
        }

        let userMsg = isHi ? '🎤 आवाज़ इनपुट शुरू नहीं हो सका।' : '🎤 Voice input error.';
        if (errorType === 'not-allowed') {
          userMsg = isHi 
            ? '🔒 माइक्रोफ़ोन अनुमति ब्लॉक है। कृपया ब्राउज़र URL बार में 🔒 आइकॉन पर क्लिक करके Mic ऑन करें।' 
            : '🔒 Microphone access blocked. Please click the 🔒 icon in the browser URL bar to allow Mic.';
        } else if (errorType === 'audio-capture') {
          userMsg = isHi 
            ? '🎙️ माइक्रोफ़ोन व्यस्त या अनुपलब्ध है। कृपया कोई अन्य रिकॉर्डिंग ऐप बंद करें।' 
            : '🎙️ Microphone hardware busy or unavailable. Please close other recording apps.';
        }

        addAgentMessage(userMsg, undefined, undefined, undefined, false);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (accumulatedText.trim()) {
          const textToSubmit = accumulatedText.trim();
          accumulatedText = '';
          handleSendMessage(textToSubmit);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error('Failed to start speech recognition:', e);
      setIsListening(false);
    }
  };

  // Append Agent Message helper
  const addAgentMessage = (
    text: string, 
    options?: AgentMessage['options'], 
    cardType?: AgentMessage['cardType'], 
    cardData?: any,
    autoSpeak: boolean = true
  ) => {
    const newMsg: AgentMessage = {
      id: Date.now().toString() + Math.random(),
      sender: 'agent',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      options,
      cardType,
      cardData
    };
    setMessages((prev) => [...prev, newMsg]);

    if (autoSpeak) {
      speakText(text);
    }
  };

  // Append User Message helper
  const addUserMessage = (text: string) => {
    const newMsg: AgentMessage = {
      id: Date.now().toString() + Math.random(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  // ROOT MENU DISPLAY (Low-Literacy Visual Option Grid - Multilanguage)
  const showRootMenu = () => {
    stopSpeaking();
    setBookingState({ step: 'root' });

    const langKey = (i18n.language || 'hi').split('-')[0].toLowerCase();
    const dict = AGENT_I18N[langKey] || AGENT_I18N['en'] || AGENT_I18N['hi'];
    const welcomeTitle = dict.welcome.replace('{name}', farmerName);

    const rootOptions = [
      {
        id: 'opt_book',
        label: `1️⃣ ${dict.book_label}`,
        sublabel: dict.book_sub,
        color: 'emerald',
        icon: Calendar,
        action: () => startBookingFlow()
      },
      {
        id: 'opt_status',
        label: `2️⃣ ${dict.status_label}`,
        sublabel: dict.status_sub,
        color: 'blue',
        icon: Search,
        action: () => checkBookingStatus()
      },
      {
        id: 'opt_reschedule',
        label: `3️⃣ ${dict.resched_label}`,
        sublabel: dict.resched_sub,
        color: 'amber',
        icon: RefreshCw,
        action: () => showRescheduleCancelOptions()
      },
      {
        id: 'opt_msp',
        label: `4️⃣ ${dict.msp_label}`,
        sublabel: dict.msp_sub,
        color: 'orange',
        icon: Sprout,
        action: () => showMspRates()
      },
      {
        id: 'opt_history',
        label: `5️⃣ ${dict.history_label}`,
        sublabel: dict.history_sub,
        color: 'purple',
        icon: History,
        action: () => showProcurementHistory()
      },
      {
        id: 'opt_voice_help',
        label: `6️⃣ ${dict.voice_label}`,
        sublabel: dict.voice_sub,
        color: 'teal',
        icon: Volume2,
        action: () => speakText(dict.voice_help)
      }
    ];

    addAgentMessage(welcomeTitle, rootOptions, undefined, undefined, true);
  };

  // --- 1. BOOKING APPOINTMENT FLOW (Option Guided) ---
  const startBookingFlow = async () => {
    stopSpeaking();
    const txt = getKisaanFlowI18n(i18n.language);
    const dict = AGENT_I18N[(i18n.language || 'hi').split('-')[0].toLowerCase()] || AGENT_I18N['en'];

    addUserMessage(dict.book_label);

    if (!session?.user) {
      addAgentMessage(
        txt.login_required,
        [
          {
            id: 'login_opt',
            label: txt.login_btn,
            action: () => { setIsOpen(false); navigate('/login'); }
          }
        ]
      );
      return;
    }

    setLoading(true);

    try {
      // 1. Check if farmer ALREADY has an active booking token
      const { data: existingActive } = await supabase
        .from('bookings')
        .select(`
          id,
          token,
          product_name,
          quantity,
          status,
          procurement_centres ( name ),
          booking_dates ( date )
        `)
        .eq('farmer_id', session.user.id)
        .in('status', ['booked', 'called', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingActive && existingActive.length > 0) {
        const active = existingActive[0];
        const centreObj = active.procurement_centres as any;
        const dateObj = active.booking_dates as any;

        addAgentMessage(
          txt.active_token_exist(active.token, centreObj?.name || 'Depot', active.product_name, active.quantity, dateObj?.date || ''),
          [
            {
              id: 'view_act',
              label: txt.view_status_btn,
              color: 'blue',
              action: () => checkBookingStatus()
            },
            {
              id: 'mod_act',
              label: txt.resched_cancel_btn,
              color: 'amber',
              action: () => showRescheduleCancelOptions()
            },
            {
              id: 'home_act',
              label: txt.main_menu_btn,
              action: () => showRootMenu()
            }
          ]
        );
        setLoading(false);
        return;
      }

      setLoading(false);
      // Prompt user for Location Permission FIRST
      setBookingState({ step: 'location_permission' });
      addAgentMessage(
        txt.ask_location_permission,
        [
          {
            id: 'loc_yes',
            label: txt.allow_location_btn,
            color: 'emerald',
            action: () => requestLocationAndRecommendCentre()
          },
          {
            id: 'loc_manual',
            label: txt.manual_location_btn,
            color: 'amber',
            action: () => fetchCentresAndShowBlockMenu()
          },
          {
            id: 'loc_home',
            label: `3️⃣ ${txt.main_menu_btn}`,
            color: 'blue',
            action: () => showRootMenu()
          }
        ],
        undefined, undefined, true
      );
    } catch (e: any) {
      addAgentMessage(
        txt.load_crop_err,
        [{ id: 'retry', label: txt.retry_btn, action: () => startBookingFlow() }]
      );
      setLoading(false);
    }
  };

  const requestLocationAndRecommendCentre = async () => {
    stopSpeaking();
    const txt = getKisaanFlowI18n(i18n.language);
    setLoading(true);
    addAgentMessage(txt.loc_detecting, undefined, undefined, undefined, true);

    if (!navigator.geolocation) {
      addAgentMessage(txt.loc_failed_fallback);
      fetchCentresAndShowBlockMenu();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const { data: centresData, error } = await supabase
            .from('procurement_centres')
            .select(`
              id,
              name,
              daily_capacity,
              status,
              latitude,
              longitude,
              geo_blocks (
                block_code,
                block_name,
                district_name,
                state_name
              )
            `)
            .eq('status', 'open');

          if (error || !centresData || centresData.length === 0) {
            addAgentMessage(
              txt.no_centres_avail,
              [{ id: 'back_root', label: txt.main_menu_btn, action: () => showRootMenu() }]
            );
            setLoading(false);
            return;
          }

          const withDistances = centresData.map((c: any) => {
            const dist = (c.latitude && c.longitude)
              ? calculateDistance(latitude, longitude, c.latitude, c.longitude)
              : 9999;
            return { ...c, distanceKm: dist };
          });

          withDistances.sort((a, b) => a.distanceKm - b.distanceKm);

          const recommendedCentre: any = withDistances[0];
          const geoBlock = Array.isArray(recommendedCentre.geo_blocks)
            ? recommendedCentre.geo_blocks[0]
            : recommendedCentre.geo_blocks;
          const recBlockName = geoBlock?.block_name || 'Nearest Area';
          const distKm = recommendedCentre.distanceKm < 9000
            ? recommendedCentre.distanceKm
            : undefined;

          addAgentMessage(
            txt.nearest_centre_found(recommendedCentre.name, distKm, recBlockName),
            [
              {
                id: 'auto_yes',
                label: txt.auto_yes_btn(recommendedCentre.name),
                color: 'emerald',
                action: () => selectBookingCentre(recommendedCentre)
              },
              {
                id: 'auto_choose_other',
                label: txt.choose_other_btn,
                color: 'amber',
                action: () => showBlockSelectionMenu(centresData)
              },
              {
                id: 'auto_main_menu',
                label: `3️⃣ ${txt.main_menu_btn}`,
                color: 'blue',
                action: () => showRootMenu()
              }
            ],
            undefined, undefined, true
          );
        } catch (e) {
          addAgentMessage(txt.loc_failed_fallback);
          fetchCentresAndShowBlockMenu();
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.warn('Geolocation denied or error:', err);
        addAgentMessage(txt.loc_failed_fallback);
        fetchCentresAndShowBlockMenu();
      },
      { timeout: 8000 }
    );
  };

  const fetchCentresAndShowBlockMenu = async () => {
    stopSpeaking();
    const txt = getKisaanFlowI18n(i18n.language);
    setLoading(true);
    try {
      const { data: centresData, error } = await supabase
        .from('procurement_centres')
        .select(`
          id,
          name,
          daily_capacity,
          status,
          geo_blocks (
            block_code,
            block_name,
            district_name,
            state_name
          )
        `)
        .eq('status', 'open');

      if (error || !centresData || centresData.length === 0) {
        addAgentMessage(
          txt.no_centres_avail,
          [{ id: 'back_root', label: txt.main_menu_btn, action: () => showRootMenu() }]
        );
        return;
      }
      showBlockSelectionMenu(centresData);
    } catch (e) {
      addAgentMessage(
        txt.load_crop_err,
        [{ id: 'retry', label: txt.retry_btn, action: () => fetchCentresAndShowBlockMenu() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const showBlockSelectionMenu = (centresData: any[]) => {
    stopSpeaking();
    const txt = getKisaanFlowI18n(i18n.language);

    const uniqueBlocksMap = new Map();
    centresData.forEach((c: any) => {
      if (c.geo_blocks?.block_code) {
        uniqueBlocksMap.set(c.geo_blocks.block_code, {
          code: c.geo_blocks.block_code,
          name: c.geo_blocks.block_name,
          district: c.geo_blocks.district_name
        });
      }
    });

    const blocks = Array.from(uniqueBlocksMap.values());

    setBookingState({
      step: 'block',
      centresList: centresData
    });

    const blockOptions = blocks.slice(0, 7).map((b, idx) => ({
      id: `blk_${b.code}`,
      label: `${NUMBER_EMOJIS[idx] || `${idx + 1}.`} 📍 ${b.name} (${b.district})`,
      color: 'emerald',
      action: () => selectBookingBlock(b.code, b.name, centresData)
    }));

    blockOptions.unshift({
      id: 'blk_search_name',
      label: txt.search_centre_btn,
      color: 'amber',
      action: () => promptSearchCentreByName()
    });

    blockOptions.push({
      id: 'blk_manual',
      label: txt.all_centres_btn,
      color: 'blue',
      action: () => {
        setIsOpen(false);
        navigate('/farmer/book');
      }
    });

    addAgentMessage(
      txt.step1_block,
      blockOptions
    );
  };

  const selectBookingBlock = (blockCode: number, blockName: string, allCentres: any[]) => {
    stopSpeaking();
    const txt = getKisaanFlowI18n(i18n.language);
    addUserMessage(`📍 ${blockName}`);

    const matchedCentres = allCentres.filter((c) => c.geo_blocks?.block_code === blockCode);

    if (matchedCentres.length === 0) {
      addAgentMessage(txt.no_centres_in_block);
      return;
    }

    setBookingState((prev) => ({
      ...prev,
      step: 'centre',
      selectedBlockCode: blockCode
    }));

    const centreOptions = matchedCentres.map((c, idx) => ({
      id: `cnt_${c.id}`,
      label: `${NUMBER_EMOJIS[idx] || `${idx + 1}.`} 🏢 ${c.name}`,
      sublabel: `⭐ 4.8/5.0 Rating • ${txt.capacity_label}: ${c.daily_capacity} ${txt.farmer_per_day}`,
      color: 'emerald',
      action: () => selectBookingCentre(c)
    }));

    addAgentMessage(
      txt.step2_centre(blockName),
      centreOptions
    );
  };

  const selectBookingCentre = async (centre: any) => {
    stopSpeaking();
    const txt = getKisaanFlowI18n(i18n.language);
    addUserMessage(`🏢 ${centre.name}`);
    setLoading(true);

    try {
      // Fetch products for this centre from centre_products first, fallback to products table
      const { data: centreProds } = await supabase
        .from('centre_products')
        .select('*')
        .eq('centre_id', centre.id);

      let prods = centreProds && centreProds.length > 0 ? centreProds : null;

      if (!prods) {
        const { data: globalProds } = await supabase.from('products').select('*');
        prods = globalProds;
      }

      setBookingState((prev) => ({
        ...prev,
        step: 'product',
        selectedCentre: centre,
        productsList: prods || []
      }));

      const cropOptions = (prods || [
        { id: 'p1', product_name: 'Wheat', max_quantity_per_farmer: 5000 },
        { id: 'p2', product_name: 'Paddy', max_quantity_per_farmer: 5000 }
      ]).map((p: any, idx: number) => {
        const localizedName = getLocalizedCropName(p.product_name, i18n.language);
        return {
          id: `crop_${p.id || p.product_name}`,
          label: `${NUMBER_EMOJIS[idx] || `${idx + 1}.`} 🌾 ${localizedName}`,
          sublabel: `${txt.max_limit}: ${p.max_quantity_per_farmer || 5000} kg`,
          color: 'amber',
          action: () => selectBookingProduct(p, centre)
        };
      });

      addAgentMessage(
        txt.step3_crop,
        cropOptions,
        undefined, undefined, true
      );
    } catch (e) {
      console.error(e);
      addAgentMessage(txt.load_crop_err);
    } finally {
      setLoading(false);
    }
  };

  const selectBookingProduct = (product: any, centreParam?: any) => {
    stopSpeaking();
    const txt = getKisaanFlowI18n(i18n.language);
    const langKey = (i18n.language || 'hi').split('-')[0].toLowerCase();
    const localizedCrop = getLocalizedCropName(product.product_name, i18n.language);
    addUserMessage(`🌾 ${localizedCrop}`);

    const targetCentre = centreParam || bookingState.selectedCentre;

    setBookingState((prev) => ({
      ...prev,
      step: 'qty',
      selectedCentre: targetCentre,
      selectedProduct: product
    }));

    const qUnit = LOCALIZED_QUINTALS[langKey] || 'Quintals';
    const customPromptMsg = langKey === 'bn' ? 'অনুগ্রহ করে কেজিতে সঠিক ওজন লিখুন বা বলুন (যেমন: ৪৮০ বা ৫৬০ কেজি):' :
      langKey === 'mr' ? 'कृपया किग्रामध्ये अचूक वजन टाइप करा किंवा बोला (उदा: ४८० किंवा ५६० किग्रा):' :
      langKey === 'te' ? 'దయచేసి కిలోలలో మీ ఖచ్చితమైన బరువును టైప్ చేయండి లేదా మాట్లాడండి (ఉదా: 480 లేదా 560 కిలోలు):' :
      langKey === 'ta' ? 'கிலோவில் உங்கள் துல்லியமான எடையைத் தட்டச்சு செய்யவும் அல்லது பேசவும் (எ.கா: 480 அல்லது 560 கிலோ):' :
      langKey === 'pa' ? 'ਕਿਰਪਾ ਕਰਕੇ ਕਿਲੋ ਵਿੱਚ ਆਪਣਾ ਸਹੀ ਵਜ਼ਨ ਲਿਖੋ ਜਾਂ ਬੋਲੋ (ਜਿਵੇਂ: 480 ਜਾਂ 560 ਕਿਲੋ):' :
      langKey === 'hi' ? 'कृपया किग्रा में अपना सटीक वजन लिखें या बोलकर बताएं (जैसे: 480 या 560 किग्रा):' :
      'Please type or speak your exact crop weight in kg (for example: 480 or 560 kg):';

    const customBtnLabel = langKey === 'bn' ? '6️⃣ ✏️ নিজ পছন্দমতো ওজন লিখুন (যেমন: ৪৮০, ৫৬০ কেজি)' :
      langKey === 'mr' ? '6️⃣ ✏️ स्वतःचे वजन टाका (उदा: ४८०, ५६० किग्रा)' :
      langKey === 'te' ? '6️⃣ ✏️ అనుకూల బరువు నమోదు చేయండి (ఉదా: 480, 560 కిలోలు)' :
      langKey === 'ta' ? '6️⃣ ✏️ சொந்த எடையை உள்ளிடவும் (எ.கா: 480, 560 கிலோ)' :
      langKey === 'pa' ? '6️⃣ ✏️ ਆਪਣਾ ਵਜ਼ਨ ਲਿਖੋ (ਜਿਵੇਂ: 480, 560 ਕਿਲੋ)' :
      langKey === 'hi' ? '6️⃣ ✏️ मनचाहा वजन लिखें (जैसे: 480, 560 किग्रा)' :
      '6️⃣ ✏️ Enter Custom Weight (e.g. 480, 560 kg)';

    const qtyOptions = [
      { id: 'q_100', label: `1️⃣ 📦 100 kg (1 ${qUnit})`, color: 'emerald', action: () => selectBookingQty(100, product, targetCentre) },
      { id: 'q_500', label: `2️⃣ 📦 500 kg (5 ${qUnit})`, color: 'emerald', action: () => selectBookingQty(500, product, targetCentre) },
      { id: 'q_1000', label: `3️⃣ 📦 1000 kg (10 ${qUnit})`, color: 'emerald', action: () => selectBookingQty(1000, product, targetCentre) },
      { id: 'q_2000', label: `4️⃣ 📦 2000 kg (20 ${qUnit})`, color: 'emerald', action: () => selectBookingQty(2000, product, targetCentre) },
      { id: 'q_5000', label: `5️⃣ 📦 5000 kg (50 ${qUnit})`, color: 'emerald', action: () => selectBookingQty(5000, product, targetCentre) },
      { id: 'q_custom', label: customBtnLabel, color: 'amber', action: () => addAgentMessage(customPromptMsg, undefined, undefined, undefined, true) }
    ];

    addAgentMessage(
      txt.step4_qty,
      qtyOptions,
      undefined, undefined, true
    );
  };

  const selectBookingQty = async (qty: number, productParam?: any, centreParam?: any) => {
    stopSpeaking();
    const txt = getKisaanFlowI18n(i18n.language);
    const langKey = (i18n.language || 'hi').split('-')[0].toLowerCase();
    const bcpLang = BCP47_LANG_MAP[langKey] || 'hi-IN';

    addUserMessage(`📦 ${qty} kg`);
    setLoading(true);

    try {
      const currentCentre = centreParam || bookingState.selectedCentre;
      const currentProduct = productParam || bookingState.selectedProduct;

      if (!currentCentre) {
        addAgentMessage(
          txt.select_centre_first,
          [{ id: 'back_book', label: txt.select_centre_btn, action: () => startBookingFlow() }]
        );
        setLoading(false);
        return;
      }

      // Fetch existing booking dates for this centre
      const todayStr = new Date().toISOString().split('T')[0];
      let { data: dateRows } = await supabase
        .from('booking_dates')
        .select('*')
        .eq('centre_id', currentCentre.id)
        .gte('date', todayStr)
        .neq('status', 'closed')
        .order('date', { ascending: true })
        .limit(6);

      if (!dateRows || dateRows.length === 0) {
        const { data: allCentreDates } = await supabase
          .from('booking_dates')
          .select('*')
          .eq('centre_id', currentCentre.id)
          .neq('status', 'closed')
          .order('date', { ascending: true })
          .limit(6);
        dateRows = allCentreDates;
      }

      if (!dateRows || dateRows.length === 0) {
        const insertedRows = [];
        for (let i = 0; i < 5; i++) {
          const d = new Date();
          d.setDate(d.getDate() + i);
          const dateStr = d.toISOString().split('T')[0];

          const { data: existingSlot } = await supabase
            .from('booking_dates')
            .select('*')
            .eq('centre_id', currentCentre.id)
            .eq('date', dateStr)
            .maybeSingle();

          if (existingSlot) {
            insertedRows.push(existingSlot);
          } else {
            const { data: newSlot } = await supabase
              .from('booking_dates')
              .insert({
                centre_id: currentCentre.id,
                date: dateStr,
                capacity: currentCentre.daily_capacity || 50,
                booked_count: 0,
                status: 'open'
              })
              .select('*')
              .single();

            if (newSlot) {
              insertedRows.push(newSlot);
            }
          }
        }
        dateRows = insertedRows;
      }

      setBookingState((prev) => ({
        ...prev,
        step: 'date',
        selectedCentre: currentCentre,
        selectedProduct: currentProduct,
        quantity: qty,
        datesList: dateRows
      }));

      const dateOptions = (dateRows || []).map((d: any, idx: number) => {
        const dateObj = new Date(d.date);
        const formattedDate = dateObj.toLocaleDateString(bcpLang, {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
        const relativeLabel = getRelativeDateLabel(d.date, idx, i18n.language);
        const displayLabel = relativeLabel ? `${formattedDate} (${relativeLabel})` : formattedDate;
        const availableSlots = Math.max(0, (d.capacity || 50) - (d.booked_count || 0));

        return {
          id: `dt_${d.id}`,
          label: `${NUMBER_EMOJIS[idx] || `${idx + 1}.`} 📅 ${displayLabel}`,
          sublabel: `${txt.booked_count_label}: ${d.booked_count || 0}/${d.capacity || 50} • (${availableSlots} slots left)`,
          color: 'emerald',
          action: () => confirmAndCreateBooking(d, qty, currentProduct, currentCentre)
        };
      });

      addAgentMessage(
        txt.step5_date,
        dateOptions,
        undefined, undefined, true
      );
    } catch (e: any) {
      console.error('Error fetching dates:', e);
      addAgentMessage(
        txt.load_date_err(e?.message || 'Retry'),
        [{ id: 'retry_qty', label: txt.retry_btn, action: () => selectBookingQty(qty, productParam, centreParam) }]
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmAndCreateBooking = async (dateObj: any, qty: number, productParam?: any, centreParam?: any) => {
    stopSpeaking();
    const txt = getKisaanFlowI18n(i18n.language);
    const centre = centreParam || bookingState.selectedCentre;
    const product = productParam || bookingState.selectedProduct;

    addUserMessage(`📅 ${dateObj.date}`);
    setLoading(true);

    try {
      const { data: { session: activeSession } } = await supabase.auth.getSession();
      const farmerUserId = activeSession?.user?.id || session?.user?.id;

      if (!farmerUserId) {
        addAgentMessage(txt.login_required);
        setLoading(false);
        return;
      }

      if (!centre || !product || !dateObj?.id) {
        addAgentMessage(
          txt.invalid_booking_selection,
          [{ id: 'restart_bk', label: txt.restart_booking_btn, action: () => startBookingFlow() }]
        );
        setLoading(false);
        return;
      }

      const { data, error: rpcErr } = await supabase.rpc('create_farmer_booking', {
        p_farmer_id: farmerUserId,
        p_centre_id: centre.id,
        p_booking_date_id: dateObj.id,
        p_product_name: product.product_name,
        p_quantity: qty
      });

      if (rpcErr) {
        throw new Error(rpcErr.message);
      }

      const result = data as any;
      if (result?.success) {
        const tokenNum = result.token;
        const bookingId = result.booking_id;

        const { count } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('centre_id', centre.id)
          .eq('booking_date_id', dateObj.id)
          .in('status', ['booked', 'called', 'in_progress'])
          .lt('token', tokenNum);

        const peopleAhead = count || 0;
        const arrivalWindow = calculateArrivalWindow(
          centre.opening_time || '09:00',
          10,
          peopleAhead,
          dateObj.date
        );

        addAgentMessage(
          txt.booking_success_title(farmerName, tokenNum),
          [
            {
              id: 'dl_pass',
              label: txt.download_pass_btn,
              color: 'emerald',
              action: () => generateTokenPDF(bookingId, arrivalWindow ? `${arrivalWindow.earliestTime} - ${arrivalWindow.latestTime}` : undefined)
            },
            {
              id: 'view_dash',
              label: txt.go_dashboard_btn,
              color: 'blue',
              action: () => { setIsOpen(false); navigate('/farmer'); }
            },
            {
              id: 'root_opt',
              label: txt.main_menu_btn,
              color: 'purple',
              action: () => showRootMenu()
            }
          ],
          'booking_success',
          {
            token: tokenNum,
            centreName: centre.name,
            productName: product.product_name,
            quantity: qty,
            date: dateObj.date,
            peopleAhead,
            arrivalWindow,
            bookingId
          }
        );
      } else {
        throw new Error(result?.message || 'Booking transaction failed.');
      }
    } catch (err: any) {
      console.error('Booking creation error:', err);
      addAgentMessage(
        txt.booking_failed(err.message || 'Slot full'),
        [{ id: 'retry', label: txt.try_again_btn, action: () => startBookingFlow() }]
      );
    } finally {
      setLoading(false);
    }
  };

  // --- 2. CHECK BOOKING STATUS & LIVE QUEUE ---
  const checkBookingStatus = async () => {
    stopSpeaking();
    const langKey = (i18n.language || 'hi').split('-')[0].toLowerCase();
    const dict = AGENT_I18N[langKey] || AGENT_I18N['en'] || AGENT_I18N['hi'];
    const txt = getKisaanFlowI18n(i18n.language);

    addUserMessage(dict.status_label);

    if (!session?.user) {
      addAgentMessage(txt.login_required);
      return;
    }

    setLoading(true);

    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          token,
          product_name,
          quantity,
          status,
          created_at,
          centre_id,
          booking_date_id,
          procurement_centres (
            name,
            opening_time
          ),
          booking_dates (
            date
          )
        `)
        .eq('farmer_id', session.user.id)
        .in('status', ['booked', 'called', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!bookings || bookings.length === 0) {
        addAgentMessage(
          txt.no_active_token,
          [
            {
              id: 'book_now',
              label: txt.book_now_btn,
              color: 'emerald',
              action: () => startBookingFlow()
            },
            {
              id: 'main_menu',
              label: txt.main_menu_btn,
              action: () => showRootMenu()
            }
          ]
        );
        setLoading(false);
        return;
      }

      const active = bookings[0];
      const centreObj = active.procurement_centres as any;
      const dateObj = active.booking_dates as any;

      // Queue position
      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('centre_id', active.centre_id)
        .eq('booking_date_id', active.booking_date_id)
        .in('status', ['booked', 'called', 'in_progress'])
        .lt('token', active.token);

      const peopleAhead = count || 0;
      const arrival = calculateArrivalWindow(
        centreObj?.opening_time || '09:00',
        10,
        peopleAhead,
        dateObj?.date
      );

      addAgentMessage(
        txt.live_status_title(active.token),
        [
          {
            id: 'dl_pass',
            label: txt.download_pass_btn,
            color: 'emerald',
            action: () => generateTokenPDF(active.id, arrival ? `${arrival.earliestTime} - ${arrival.latestTime}` : undefined)
          },
          {
            id: 'resched_opt',
            label: txt.resched_cancel_btn,
            color: 'amber',
            action: () => showRescheduleCancelOptions()
          },
          {
            id: 'main_menu',
            label: txt.main_menu_btn,
            action: () => showRootMenu()
          }
        ],
        'booking_status',
        {
          token: active.token,
          status: active.status,
          centreName: centreObj?.name,
          date: dateObj?.date,
          productName: active.product_name,
          quantity: active.quantity,
          peopleAhead,
          arrivalWindow: arrival
        }
      );
    } catch (err) {
      console.error(err);
      addAgentMessage(txt.check_status_err);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. RESCHEDULE / CANCEL FLOW ---
  const showRescheduleCancelOptions = async () => {
    stopSpeaking();
    const langKey = (i18n.language || 'hi').split('-')[0].toLowerCase();
    const dict = AGENT_I18N[langKey] || AGENT_I18N['en'] || AGENT_I18N['hi'];
    const txt = getKisaanFlowI18n(i18n.language);

    addUserMessage(dict.resched_label);

    if (!session?.user) {
      addAgentMessage(txt.login_required);
      return;
    }

    setLoading(true);

    try {
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          *,
          procurement_centres(name, cancellation_window_hours),
          booking_dates(date)
        `)
        .eq('farmer_id', session.user.id)
        .in('status', ['booked'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (!bookings || bookings.length === 0) {
        addAgentMessage(
          txt.no_active_to_cancel,
          [{ id: 'back_root', label: txt.main_menu_btn, action: () => showRootMenu() }]
        );
        setLoading(false);
        return;
      }

      const active = bookings[0];
      const centreObj = active.procurement_centres as any;
      const dateObj = active.booking_dates as any;

      const windowHours = centreObj?.cancellation_window_hours || 24;
      const slotDate = new Date(dateObj?.date);
      const deadline = new Date(slotDate.getTime() - windowHours * 3600 * 1000);
      const isPastDeadline = new Date() > deadline;

      if (isPastDeadline) {
        addAgentMessage(
          txt.window_closed(active.token, windowHours),
          [
            {
              id: 'view_dash',
              label: txt.view_status_btn,
              color: 'blue',
              action: () => checkBookingStatus()
            },
            {
              id: 'main_menu',
              label: txt.main_menu_btn,
              action: () => showRootMenu()
            }
          ]
        );
        setLoading(false);
        return;
      }

      addAgentMessage(
        txt.reschedule_prompt(active.token, active.product_name, active.quantity, centreObj?.name || 'Depot'),
        [
          {
            id: 'cancel_act',
            label: txt.cancel_booking_btn,
            color: 'red',
            action: () => executeCancelBooking(active.id, active.token)
          },
          {
            id: 'resched_act',
            label: txt.reschedule_new_date_btn,
            color: 'amber',
            action: () => {
              setIsOpen(false);
              navigate('/farmer');
            }
          },
          {
            id: 'main_menu',
            label: txt.main_menu_btn,
            action: () => showRootMenu()
          }
        ]
      );
    } catch (e) {
      console.error(e);
      addAgentMessage(txt.check_status_err);
    } finally {
      setLoading(false);
    }
  };

  const executeCancelBooking = async (bookingId: string, token: number) => {
    stopSpeaking();
    const txt = getKisaanFlowI18n(i18n.language);
    setLoading(true);

    try {
      const { error: rpcErr } = await supabase.rpc('cancel_farmer_booking', {
        p_booking_id: bookingId,
        p_reason: 'Cancelled via Kisan Saathi AI Agent'
      });

      if (rpcErr) {
        throw new Error(rpcErr.message);
      }

      addAgentMessage(
        txt.cancel_success(token),
        [
          {
            id: 'book_new',
            label: txt.book_now_btn,
            color: 'emerald',
            action: () => startBookingFlow()
          },
          {
            id: 'main_menu',
            label: txt.main_menu_btn,
            action: () => showRootMenu()
          }
        ]
      );
    } catch (err: any) {
      console.error('Cancellation error:', err);
      addAgentMessage(
        txt.cancel_failed(err.message || 'Window closed'),
        [{ id: 'main_menu', label: txt.main_menu_btn, action: () => showRootMenu() }]
      );
    } finally {
      setLoading(false);
    }
  };

  // --- 4. VIEW MSP RATES ---
  const showMspRates = async () => {
    stopSpeaking();
    const langKey = (i18n.language || 'hi').split('-')[0].toLowerCase();
    const dict = AGENT_I18N[langKey] || AGENT_I18N['en'] || AGENT_I18N['hi'];
    const txt = getKisaanFlowI18n(i18n.language);

    addUserMessage(dict.msp_label);
    setLoading(true);

    try {
      const { data: mspList, error } = await supabase
        .from('msp_rates')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) throw error;

      addAgentMessage(
        txt.msp_title,
        [{ id: 'main_menu', label: txt.main_menu_btn, action: () => showRootMenu() }],
        'msp_list',
        mspList || [
          { crop_name: 'Wheat (गेहूं)', category: 'Rabi', msp_price: 2275, unit: 'Quintal' },
          { crop_name: 'Paddy Common (धान)', category: 'Kharif', msp_price: 2183, unit: 'Quintal' },
          { crop_name: 'Maize (मक्का)', category: 'Kharif', msp_price: 2090, unit: 'Quintal' }
        ]
      );
    } catch (e) {
      console.error(e);
      addAgentMessage(txt.msp_failed);
    } finally {
      setLoading(false);
    }
  };

  // --- 5. VIEW PROCUREMENT HISTORY & RECEIPTS ---
  const showProcurementHistory = async () => {
    stopSpeaking();
    const langKey = (i18n.language || 'hi').split('-')[0].toLowerCase();
    const dict = AGENT_I18N[langKey] || AGENT_I18N['en'] || AGENT_I18N['hi'];
    const txt = getKisaanFlowI18n(i18n.language);

    addUserMessage(dict.history_label);

    if (!session?.user) {
      addAgentMessage(txt.login_required);
      return;
    }

    setLoading(true);

    try {
      const { data: farmerBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('farmer_id', session.user.id);

      if (!farmerBookings || farmerBookings.length === 0) {
        addAgentMessage(
          txt.no_history_found,
          [{ id: 'main_menu', label: txt.main_menu_btn, action: () => showRootMenu() }]
        );
        setLoading(false);
        return;
      }

      const bIds = farmerBookings.map((b) => b.id);
      const { data: historyData, error } = await supabase
        .from('procurements')
        .select(`
          id,
          created_at,
          quantity_accepted,
          total_amount,
          note,
          bookings (
            token,
            product_name,
            procurement_centres ( name )
          ),
          payments ( status )
        `)
        .in('booking_id', bIds)
        .order('created_at', { ascending: false });

      if (error || !historyData || historyData.length === 0) {
        addAgentMessage(
          txt.no_completed_history,
          [{ id: 'main_menu', label: txt.main_menu_btn, action: () => showRootMenu() }]
        );
        setLoading(false);
        return;
      }

      addAgentMessage(
        txt.history_title(historyData.length),
        [{ id: 'main_menu', label: txt.main_menu_btn, action: () => showRootMenu() }],
        'history_list',
        historyData
      );
    } catch (e) {
      console.error(e);
      addAgentMessage(txt.history_failed);
    } finally {
      setLoading(false);
    }
  };

  // --- 6. SEARCH PROCUREMENT CENTRE BY NAME / CITY / DISTRICT ---
  const promptSearchCentreByName = () => {
    stopSpeaking();
    const langKey = (i18n.language || 'hi').split('-')[0].toLowerCase();
    setBookingState({ step: 'search_centre' });
    const msg = langKey === 'bn' ? 'অনুগ্রহ করে ক্রয় কেন্দ্র, শহর বা জেলার নাম লিখুন বা বলুন:' :
      langKey === 'mr' ? 'कृपया खरेदी केंद्र, शहर किंवा जिल्ह्याचे नाव टाइप करा किंवा बोला:' :
      langKey === 'te' ? 'దయచేసి కొనుగోలు కేంద్రం, నగరం లేదా జిల్లా పేరును టైప్ చేయండి లేదా మాట్లాడండి:' :
      langKey === 'ta' ? 'தயவுசெய்து கொள்முதல் மையம், நகரம் அல்லது மாவட்டத்தின் பெயரைத் தட்டச்சு செய்யவும் அல்லது பேசவும்:' :
      langKey === 'pa' ? 'ਕਿਰਪਾ ਕਰਕੇ ਖਰੀਦ ਕੇਂਦਰ, ਸ਼ਹਿਰ ਜਾਂ ਜ਼ਿਲ੍ਹੇ ਦਾ ਨਾਮ ਲਿਖੋ ਜਾਂ ਬੋਲੋ:' :
      langKey === 'hi' ? 'कृपया खरीद केंद्र, शहर या जिले का नाम लिखें या बोलकर बताएं:' :
      'Please type or speak the name of the Procurement Centre, City, or District:';
    addAgentMessage(msg, undefined, undefined, undefined, true);
  };

  const searchProcurementCentreByName = async (queryText: string) => {
    stopSpeaking();
    const txt = getKisaanFlowI18n(i18n.language);
    const langKey = (i18n.language || 'hi').split('-')[0].toLowerCase();
    setLoading(true);

    try {
      const { data: centresData } = await supabase
        .from('procurement_centres')
        .select(`
          id,
          name,
          daily_capacity,
          status,
          geo_blocks (
            block_code,
            block_name,
            district_name,
            state_name
          )
        `)
        .ilike('name', `%${queryText}%`)
        .eq('status', 'open')
        .limit(10);

      let results = centresData || [];

      if (results.length === 0) {
        const { data: blockCentres } = await supabase
          .from('procurement_centres')
          .select(`
            id,
            name,
            daily_capacity,
            status,
            geo_blocks!inner (
              block_code,
              block_name,
              district_name,
              state_name
            )
          `)
          .or(`block_name.ilike.%${queryText}%,district_name.ilike.%${queryText}%`, { foreignTable: 'geo_blocks' })
          .eq('status', 'open')
          .limit(10);

        if (blockCentres) {
          results = blockCentres;
        }
      }

      if (results.length === 0) {
        const notFoundMsg = langKey === 'bn' ? `"${queryText}" নামে কোনো ক্রয় কেন্দ্র পাওয়া যায়নি। আপনি নিচের অপশনগুলি থেকে আবার চেষ্টা করতে পারেন:` :
          langKey === 'mr' ? `"${queryText}" या नावाने कोणतेही खरेदी केंद्र आढळले नाही. तुम्ही खालील पर्यायांवरून पुन्हा प्रयत्न करू शकता:` :
          langKey === 'te' ? `"${queryText}" పేరుతో ఎటువంటి కొనుగోలు కేంద్రం కనుగొనబడలేదు. క్రింది ఆప్షన్ల నుండి మళ్లీ ప్రయత్నించండి:` :
          langKey === 'ta' ? `"${queryText}" என்ற பெயரில் கொள்முதல் மையம் எதுவும் காணப்படவில்லை. கீழே உள்ள விருப்பங்களை முயற்சிக்கவும்:` :
          langKey === 'pa' ? `"${queryText}" ਨਾਮ ਦਾ ਕੋਈ ਖਰੀਦ ਕੇਂਦਰ ਨਹੀਂ ਮਿਲਿਆ। ਤੁਸੀਂ ਹੇਠਾਂ ਦਿੱਤੇ ਵਿਕਲਪਾਂ ਦੀ ਵਰਤੋਂ ਕਰ ਸਕਦੇ ਹੋ:` :
          langKey === 'hi' ? `"${queryText}" नाम से कोई खरीद केंद्र नहीं मिला। कृपया पुनः प्रयास करें या सभी केंद्र देखें:` :
          `No procurement centre found matching "${queryText}". You can retry or browse all centres:`;

        addAgentMessage(notFoundMsg, [
          { id: 'retry_src', label: txt.search_centre_btn, action: () => promptSearchCentreByName() },
          { id: 'browse_all', label: txt.all_centres_btn, action: () => startBookingFlow() },
          { id: 'home_main', label: txt.main_menu_btn, action: () => showRootMenu() }
        ]);
        setLoading(false);
        return;
      }

      setBookingState({
        step: 'centre',
        centresList: results
      });

      const options = results.map((c: any, idx: number) => ({
        id: `cnt_${c.id}`,
        label: `${NUMBER_EMOJIS[idx] || `${idx + 1}.`} 🏢 ${c.name}`,
        sublabel: `📍 ${c.geo_blocks?.block_name || ''} (${c.geo_blocks?.district_name || ''}) • ${txt.capacity_label}: ${c.daily_capacity} ${txt.farmer_per_day}`,
        color: 'emerald',
        action: () => selectBookingCentre(c)
      }));

      const foundMsg = langKey === 'bn' ? `"${queryText}" অনুসন্ধান অনুসারে পাওয়া ক্রয় কেন্দ্রগুলি:` :
        langKey === 'mr' ? `"${queryText}" या शोधानुसार आढळलेली खरेदी केंद्रे:` :
        langKey === 'te' ? `"${queryText}" శోధన ద్వారా కనుగొనబడిన కొనుగోలు కేంద్రాలు:` :
        langKey === 'ta' ? `"${queryText}" தேடலில் கண்டறியப்பட்ட கொள்முதல் மையங்கள்:` :
        langKey === 'pa' ? `"${queryText}" ਖੋਜ ਅਨੁਸਾਰ ਮਿਲੇ ਖਰੀਦ ਕੇਂਦਰ:` :
        langKey === 'hi' ? `"${queryText}" खोज के अनुसार मिले खरीद केंद्र:` :
        `Found matching procurement centres for "${queryText}":`;

      addAgentMessage(foundMsg, options);
    } catch (e) {
      console.error('Error searching centre:', e);
      addAgentMessage(txt.no_centres_avail);
    } finally {
      setLoading(false);
    }
  };

  const repromptCurrentStep = () => {
    stopSpeaking();
    const langKey = (i18n.language || 'hi').split('-')[0].toLowerCase();

    const invalidMsg = langKey === 'bn' ? '⚠️ আপনার ইনপুটটি বোঝা যায়নি। অনুগ্রহ করে এই ধাপের বিকল্পগুলি থেকে নির্বাচন করুন:' :
      langKey === 'mr' ? '⚠️ तुमचा इनपुट समजला नाही. कृपया या टप्प्यातील पर्यायांमधून निवडा:' :
      langKey === 'te' ? '⚠️ మీ ఇన్‌పుట్ అర్థం కాలేదు. దయచేసి ఈ దశలోని ఆప్షన్‌ల నుండి ఎంచుకోండి:' :
      langKey === 'ta' ? '⚠️ உங்கள் உள்ளீடு புரியவில்லை. இந்த படியின் விருப்பங்களிலிருந்து தேர்ந்தெடுக்கவும்:' :
      langKey === 'pa' ? '⚠️ ਤੁਹਾਡਾ ਇਨਪੁਟ ਸਮਝ ਨਹੀਂ ਆਇਆ। ਕਿਰਪਾ ਕਰਕੇ ਇਸ ਕਦਮ ਦੇ ਵਿਕਲਪਾਂ ਤੋਂ ਚੁਣੋ:' :
      langKey === 'hi' ? '⚠️ आपका संदेश समझ नहीं आया। कृपया इस चरण के विकल्पों में से चुनें:' :
      '⚠️ Unrecognized input. Please select from the current step options below:';

    const lastAgentMsg = [...messages].reverse().find(m => m.sender === 'agent' && m.options && m.options.length > 0);

    if (lastAgentMsg && lastAgentMsg.options) {
      addAgentMessage(invalidMsg, lastAgentMsg.options, undefined, undefined, true);
    } else {
      showRootMenu();
    }
  };

  // --- NATURAL LANGUAGE / VOICE INTENT PARSER ---
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text) return;

    addUserMessage(text);
    setInputVal('');

    const lower = text.toLowerCase();

    // 1. Quantity step custom weight evaluation (e.g. 480, 560, 480 kg, 560 kg, 750, 1200)
    if (bookingState.step === 'qty') {
      const numMatches = text.match(/\d+/g);
      if (numMatches && numMatches.length > 0) {
        const numVal = parseInt(numMatches[0], 10);

        // If user entered a single option index (1..6) without weight units
        if (numVal >= 1 && numVal <= 6 && text.trim().length <= 10 && !lower.includes('kg') && !lower.includes('कलो') && !lower.includes('किलो') && !lower.includes('কেজি') && !lower.includes('किग्रा')) {
          const lastAgentMsg = [...messages].reverse().find(m => m.sender === 'agent' && m.options && m.options.length > 0);
          if (lastAgentMsg && lastAgentMsg.options && lastAgentMsg.options[numVal - 1]) {
            lastAgentMsg.options[numVal - 1].action();
            return;
          }
        }

        // Custom weight value (e.g. 480, 560, 750, 480 kg, 560 kg)
        if (numVal > 0) {
          const maxLimit = bookingState.selectedProduct?.max_quantity_per_farmer || 5000;
          if (numVal > maxLimit) {
            const langKey = (i18n.language || 'hi').split('-')[0].toLowerCase();
            const limitMsg = langKey === 'bn' ? `⚠️ ${bookingState.selectedProduct?.product_name || 'ফসল'}-এর জন্য একজন কৃষকের সর্বোচ্চ অনুমতিযোগ্য পরিমাণ ${maxLimit} কেজি। অনুগ্রহ করে কম পরিমাণ লিখুন।` :
              langKey === 'mr' ? `⚠️ ${bookingState.selectedProduct?.product_name || 'पिक'}-साठी एका शेतकऱ्याची कमाल मर्यादा ${maxLimit} किग्रा आहे. कृपया त्यापेक्षा कमी वजन टाका.` :
              langKey === 'te' ? `⚠️ ${bookingState.selectedProduct?.product_name || 'పంట'} కోసం రైతుకు గరిష్ట పరిమితి ${maxLimit} కిలోలు. దయచేసి తక్కువ బరువును నమోదు చేయండి.` :
              langKey === 'ta' ? `⚠️ ${bookingState.selectedProduct?.product_name || 'பயிர்'}-க்கு ஒரு விவசாயிக்கான அதிகபட்ச வரம்பு ${maxLimit} கிலோ. தயவுசெய்து குறைந்த எடையை உள்ளிடவும்.` :
              langKey === 'pa' ? `⚠️ ${bookingState.selectedProduct?.product_name || 'ਫ਼ਸਲ'} ਲਈ ਇੱਕ ਕਿਸਾਨ ਦੀ ਵੱਧ ਤੋਂ ਵੱਧ ਸੀਮਾ ${maxLimit} ਕਿਲੋ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਘੱਟ ਵਜ਼ਨ ਲਿਖੋ।` :
              langKey === 'hi' ? `⚠️ ${bookingState.selectedProduct?.product_name || 'फसल'} के लिए प्रति किसान अधिकतम सीमा ${maxLimit} किग्रा है। कृपया इससे कम वजन भरें।` :
              `⚠️ Maximum allowed quantity for ${bookingState.selectedProduct?.product_name || 'crop'} is ${maxLimit} kg. Please enter a weight of ${maxLimit} kg or less.`;
            addAgentMessage(limitMsg);
            return;
          }
          selectBookingQty(numVal);
          return;
        }
      }
    }

    // 2. Multi-language option number matching (1, 2, 3, "one", "एक", "১", "१", "ఒకటి", "ஒன்று", "ਇੱਕ")
    const numChoice = parseNumberFromText(text);
    if (numChoice !== null && bookingState.step !== 'search_centre' && bookingState.step !== 'qty') {
      const lastAgentMsg = [...messages].reverse().find(m => m.sender === 'agent' && m.options && m.options.length > 0);
      if (lastAgentMsg && lastAgentMsg.options) {
        const idx = numChoice - 1;
        if (idx >= 0 && idx < lastAgentMsg.options.length) {
          lastAgentMsg.options[idx].action();
          return;
        }
      }
    }

    // Intent Matching
    if (bookingState.step === 'product') {
      const lastAgentMsg = [...messages].reverse().find(m => m.sender === 'agent' && m.options && m.options.length > 0);
      if (lastAgentMsg && lastAgentMsg.options) {
        const matchedOpt = lastAgentMsg.options.find((opt: any) =>
          opt.label.toLowerCase().includes(lower) || lower.includes(opt.label.toLowerCase().replace(/[^a-z0-9]/gi, ''))
        );
        if (matchedOpt) {
          matchedOpt.action();
          return;
        }
      }
    }

    if (bookingState.step === 'date') {
      const lastAgentMsg = [...messages].reverse().find(m => m.sender === 'agent' && m.options && m.options.length > 0);
      if (lastAgentMsg && lastAgentMsg.options) {
        if (lower.includes('tomorrow') || lower.includes('कल') || lower.includes('আগামীকাল') || lower.includes('उद्या') || lower.includes('రేపు') || lower.includes('நாளை') || lower.includes('ਕੱਲ੍ਹ')) {
          const tomOpt = lastAgentMsg.options.find((opt: any) =>
            opt.label.includes('Tomorrow') || opt.label.includes('कल') || opt.label.includes('আগামীকাল') || opt.label.includes('उद्या') || opt.label.includes('రేపు') || opt.label.includes('நாளை') || opt.label.includes('ਕੱਲ੍ਹ')
          );
          if (tomOpt) {
            tomOpt.action();
            return;
          }
        }
        if (lower.includes('today') || lower.includes('आज') || lower.includes('আজ') || lower.includes('आज') || lower.includes('ఈరోజు') || lower.includes('இன்று') || lower.includes('ਅੱਜ')) {
          if (lastAgentMsg.options[0]) {
            lastAgentMsg.options[0].action();
            return;
          }
        }
      }
    }

    if (bookingState.step === 'qty') {
      const numMatch = text.replace(/[^0-9]/g, '');
      if (numMatch) {
        const numVal = parseInt(numMatch, 10);
        if (numVal > 0) {
          selectBookingQty(numVal);
          return;
        }
      }
    }

    if (bookingState.step === 'search_centre') {
      searchProcurementCentreByName(text);
      return;
    }

    if (
      lower.includes('book') || lower.includes('appointment') || lower.includes('slot') || 
      lower.includes('बुक') || lower.includes('नया') || lower.includes('बेचना') || lower.includes('खरीद') ||
      lower.includes('বুক') || lower.includes('নতুন') || lower.includes('বিক্রয়') || lower.includes('টোকেন') ||
      lower.includes('नवीन') || lower.includes('विक्री') ||
      lower.includes('బుక్') || lower.includes('కొత్త') || lower.includes('అమ్మకం') ||
      lower.includes('பதிவு') || lower.includes('புதிய') ||
      lower.includes('ਬੁੱਕ') || lower.includes('ਨਵਾਂ') || lower.includes('ਵੇਚਣਾ')
    ) {
      startBookingFlow();
    } else if (
      lower.includes('status') || lower.includes('queue') || lower.includes('position') || lower.includes('where') ||
      lower.includes('स्थिति') || lower.includes('कतार') || lower.includes('नंबर') || lower.includes('जांच') ||
      lower.includes('অবস্থা') || lower.includes('সিরিয়াল') || lower.includes('লাইন') || lower.includes('অপেক্ষা') ||
      lower.includes('स्थिती') || lower.includes('रांग') ||
      lower.includes('స్థితి') || lower.includes('క్యూ') || lower.includes('స్థానం') ||
      lower.includes('நிலை') || lower.includes('வரிசை') ||
      lower.includes('ਸਥਿਤੀ') || lower.includes('ਕਤਾਰ') || lower.includes('ਲਾਈਨ')
    ) {
      checkBookingStatus();
    } else if (
      lower.includes('cancel') || lower.includes('reschedule') || lower.includes('change') || lower.includes('modify') ||
      lower.includes('रद्द') || lower.includes('बदलें') || lower.includes('रिशेड्यूल') || lower.includes('कैंसिल') ||
      lower.includes('বাতিল') || lower.includes('পরিবর্তন') || lower.includes('ক্যান্সেল') ||
      lower.includes('बदला') || lower.includes('कॅन्सेल') ||
      lower.includes('రద్దు') || lower.includes('మార్చండి') ||
      lower.includes('ரத்து') || lower.includes('மாற்ற') ||
      lower.includes('ਰੱਦ') || lower.includes('ਬਦਲੋ')
    ) {
      showRescheduleCancelOptions();
    } else if (
      lower.includes('msp') || lower.includes('rate') || lower.includes('price') || lower.includes('cost') ||
      lower.includes('एमएसपी') || lower.includes('भाव') || lower.includes('मूल्य') || lower.includes('दर') || lower.includes('दाम') ||
      lower.includes('এমএসপি') || lower.includes('দাম') || lower.includes('সরকারি') ||
      lower.includes('हमीभाव') || lower.includes('किंमत') ||
      lower.includes('ధర') || lower.includes('రేటు') ||
      lower.includes('விலை') || lower.includes('விகிதம்') ||
      lower.includes('ਰੇਟ') || lower.includes('ਭਾਅ')
    ) {
      showMspRates();
    } else if (
      lower.includes('history') || lower.includes('past') || lower.includes('receipt') || lower.includes('payment') ||
      lower.includes('इतिहास') || lower.includes('पुराना') || lower.includes('रसीद') || lower.includes('भुगतान') || lower.includes('पर्ची') ||
      lower.includes('ইতিহাস') || lower.includes('পুরানো') || lower.includes('রশিদ') || lower.includes('রসিদ') || lower.includes('পেমেন্ট') ||
      lower.includes('पावती') || lower.includes('मागील') ||
      lower.includes('చరిత్ర') || lower.includes('రసీదు') || lower.includes('చెల్లింపు') ||
      lower.includes('வரலாறு') || lower.includes('ரசீது') ||
      lower.includes('ਇਤਿਹਾਸ') || lower.includes('ਰਸੀਦ')
    ) {
      showProcurementHistory();
    } else if (
      lower.includes('hi') || lower.includes('hello') || lower.includes('help') ||
      lower.includes('नमस्ते') || lower.includes('मदद') ||
      lower.includes('নমস্কার') || lower.includes('সাহায্য') ||
      lower.includes('नमस्कार') || lower.includes('మద్దతు') || lower.includes('வணக்கம்') || lower.includes('ਸਤਿ')
    ) {
      showRootMenu();
    } else {
      const currentStepStr = (bookingState.step as string);
      if (currentStepStr !== 'root' && currentStepStr !== 'search_centre') {
        repromptCurrentStep();
      } else {
        searchProcurementCentreByName(text);
      }
    }
  };

  const currentLang = (i18n.language || 'hi').split('-')[0].toLowerCase();
  const dict = AGENT_I18N[currentLang] || AGENT_I18N['en'] || AGENT_I18N['hi'];

  return (
    <>
      {/* AGENT FLOATING ACTION BUTTON */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open Kisaan Saathi AI Assistant"
            className="group flex items-center gap-3 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white px-5 py-3.5 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 ring-4 ring-emerald-400/30 cursor-pointer"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-xs">
                <Bot className="w-6 h-6 text-amber-300 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-emerald-700" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">
                {farmerName}
              </div>
              <div className="text-sm font-extrabold flex items-center gap-1.5">
                <span>{dict.header_title}</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </div>
            </div>
          </button>
        ) : null}
      </div>

      {/* AGENT MODAL / DRAWER PANEL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 transition-all">
          <div className="w-full max-w-xl bg-white h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-emerald-100 animate-in fade-in slide-in-from-bottom-5 duration-300">
            
            {/* AGENT HEADER BAR */}
            <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-4 text-white flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
                  <Bot className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black tracking-tight text-white">{dict.header_title}</h2>
                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-amber-400 text-slate-950 rounded-full">
                      Voice & Option Mode
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100/90 font-medium">
                    {dict.header_subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Global Audio Stop Button */}
                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    title="Stop Audio"
                    className="p-2 rounded-xl bg-red-500/30 hover:bg-red-500/50 text-white transition-colors"
                  >
                    <VolumeX className="w-5 h-5" />
                  </button>
                )}

                {/* Reset to Root Menu */}
                <button
                  onClick={showRootMenu}
                  title="Main Menu"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>

                {/* Close Drawer */}
                <button
                  onClick={() => {
                    stopSpeaking();
                    setIsOpen(false);
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* MESSAGES & CARDS STREAM CONTAINER */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70">
              {messages.map((msg) => {
                const isAgent = msg.sender === 'agent';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'} space-y-2`}
                  >
                    {/* Message Bubble */}
                    <div
                      className={`max-w-[90%] p-4 rounded-2xl shadow-xs text-sm ${
                        isAgent
                          ? 'bg-white border border-emerald-100 text-slate-800 rounded-tl-xs'
                          : 'bg-emerald-600 text-white font-medium rounded-tr-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                        {isAgent && (
                          <button
                            onClick={() => speakText(msg.text)}
                            title="Read Aloud"
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors shrink-0 cursor-pointer"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className={`text-[10px] mt-1.5 font-semibold ${isAgent ? 'text-slate-400' : 'text-emerald-200'}`}>
                        {msg.timestamp}
                      </div>
                    </div>

                    {/* OPTION CARDS GRID (Low Literacy Friendly) */}
                    {msg.options && msg.options.length > 0 && (
                      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {msg.options.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={opt.action}
                            className={`flex flex-col items-start p-3.5 rounded-2xl border transition-all text-left group cursor-pointer hover:shadow-md ${
                              opt.color === 'emerald'
                                ? 'bg-emerald-50/90 border-emerald-200 hover:bg-emerald-100 text-emerald-950'
                                : opt.color === 'blue'
                                ? 'bg-blue-50/90 border-blue-200 hover:bg-blue-100 text-blue-950'
                                : opt.color === 'amber'
                                ? 'bg-amber-50/90 border-amber-200 hover:bg-amber-100 text-amber-950'
                                : opt.color === 'orange'
                                ? 'bg-orange-50/90 border-orange-200 hover:bg-orange-100 text-orange-950'
                                : opt.color === 'purple'
                                ? 'bg-purple-50/90 border-purple-200 hover:bg-purple-100 text-purple-950'
                                : opt.color === 'red'
                                ? 'bg-red-50/90 border-red-200 hover:bg-red-100 text-red-950'
                                : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-extrabold text-sm flex items-center gap-2">
                                {opt.label}
                              </span>
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                            </div>
                            {opt.sublabel && (
                              <span className="text-xs text-slate-600 mt-1 font-medium">
                                {opt.sublabel}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* SPECIAL RENDER CARDS */}
                    {/* 1. BOOKING SUCCESS CARD */}
                    {msg.cardType === 'booking_success' && msg.cardData && (
                      <div className="w-full bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 space-y-3 mt-2 text-slate-900 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 bg-emerald-600 text-white font-black text-xs rounded-full">
                            TOKEN PASS
                          </span>
                          <span className="text-2xl font-black text-emerald-800">#{msg.cardData.token}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-500 font-semibold">Depot:</span>
                            <div className="font-bold">{msg.cardData.centreName}</div>
                          </div>
                          <div>
                            <span className="text-slate-500 font-semibold">Crop & Weight:</span>
                            <div className="font-bold">{msg.cardData.productName} ({msg.cardData.quantity}kg)</div>
                          </div>
                          <div>
                            <span className="text-slate-500 font-semibold">Date:</span>
                            <div className="font-bold">{msg.cardData.date}</div>
                          </div>
                          <div>
                            <span className="text-slate-500 font-semibold">Arrival Window:</span>
                            <div className="font-bold text-emerald-700">
                              {msg.cardData.arrivalWindow.earliestTime} - {msg.cardData.arrivalWindow.latestTime}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. BOOKING STATUS CARD */}
                    {msg.cardType === 'booking_status' && msg.cardData && (
                      <div className="w-full bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 space-y-3 mt-2 text-slate-900 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 bg-blue-600 text-white font-extrabold text-xs rounded-full uppercase">
                            Status: {msg.cardData.status}
                          </span>
                          <span className="text-2xl font-black text-blue-900">#{msg.cardData.token}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-500 font-semibold">Centre:</span>
                            <div className="font-bold">{msg.cardData.centreName}</div>
                          </div>
                          <div>
                            <span className="text-slate-500 font-semibold">Details:</span>
                            <div className="font-bold">{msg.cardData.productName} ({msg.cardData.quantity}kg)</div>
                          </div>
                          <div>
                            <span className="text-slate-500 font-semibold">Ahead in Line:</span>
                            <div className="font-bold text-blue-700">{msg.cardData.peopleAhead} farmers</div>
                          </div>
                          <div>
                            <span className="text-slate-500 font-semibold">Estimated Arrival:</span>
                            <div className="font-bold text-emerald-700">
                              {msg.cardData.arrivalWindow.earliestTime} - {msg.cardData.arrivalWindow.latestTime}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3. MSP RATES CARD */}
                    {msg.cardType === 'msp_list' && Array.isArray(msg.cardData) && (
                      <div className="w-full space-y-2 mt-2">
                        {msg.cardData.map((m: any, idx: number) => (
                          <div key={idx} className="bg-orange-50/80 border border-orange-200 p-3 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sprout className="w-5 h-5 text-orange-600" />
                              <div>
                                <div className="font-extrabold text-sm text-slate-900">{m.crop_name}</div>
                                <div className="text-[11px] font-semibold text-slate-500">{m.category} Crop</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-base font-black text-orange-800">₹{m.msp_price}</div>
                              <div className="text-[10px] text-slate-500">per {m.unit || 'Quintal'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 4. HISTORY LIST CARD */}
                    {msg.cardType === 'history_list' && Array.isArray(msg.cardData) && (
                      <div className="w-full space-y-2 mt-2">
                        {msg.cardData.map((h: any) => (
                          <div key={h.id} className="bg-purple-50/80 border border-purple-200 p-3.5 rounded-2xl flex flex-col space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-extrabold text-sm text-slate-900">
                                  Token #{h.bookings?.token} • {h.bookings?.product_name}
                                </div>
                                <div className="text-xs text-slate-600 mt-0.5">
                                  Accepted: <span className="font-bold text-slate-900">{h.quantity_accepted} kg</span>
                                </div>
                                <div className="text-[11px] text-purple-700 font-semibold mt-0.5">
                                  {h.bookings?.procurement_centres?.name}
                                </div>
                              </div>

                              <div className="text-right flex flex-col items-end gap-1">
                                <div className="text-base font-black text-emerald-700">₹{h.total_amount}</div>
                                <button
                                  onClick={() => generateProcurementReceipt(h.id)}
                                  className="px-2.5 py-1 bg-purple-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 hover:bg-purple-700 transition-colors cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" /> Receipt
                                </button>
                              </div>
                            </div>
                            <div className="text-[11px] text-emerald-900 font-medium bg-emerald-100/70 border border-emerald-200/60 p-2 rounded-xl flex items-center gap-1">
                              <span>🏅 Review:</span>
                              <span className="truncate">{h.note || 'Grade A • Quality Approved (Moisture < 12%)'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold p-2">
                  <Bot className="w-4 h-4 text-emerald-600 animate-spin" />
                  <span>{dict.thinking}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* INPUT & MIC FOOTER BAR */}
            <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
              {/* Voice Mic Button */}
              <button
                onClick={toggleListening}
                title="Speak to Assistant"
                className={`p-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={isListening ? dict.placeholder_listening : dict.placeholder_default}
                className="flex-1 bg-slate-100 text-slate-900 text-sm px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />

              {/* Send Button */}
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputVal.trim()}
                className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-2xl transition-colors cursor-pointer"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

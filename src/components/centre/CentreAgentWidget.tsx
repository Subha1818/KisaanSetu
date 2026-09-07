import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  X,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Send,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { parseNumberFromText } from '../../utils/numberParser';

interface StaffAgentMessage {
  id: string;
  sender: 'agent' | 'user';
  text: string;
  timestamp: string;
  options?: Array<{
    id: string;
    label: string;
    sublabel?: string;
    color?: string;
    action: () => void;
  }>;
  cardType?: 'queue_summary' | 'token_detail' | 'call_success';
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

const CENTRE_AGENT_I18N: Record<string, {
  welcome: string;
  call_next_label: string;
  call_next_sub: string;
  queue_label: string;
  queue_sub: string;
  search_label: string;
  search_sub: string;
  help_label: string;
  help_sub: string;
  help_text: string;
  header_title: string;
  header_subtitle: string;
  fab_title: string;
  fab_sub: string;
  placeholder_default: string;
  placeholder_listening: string;
  thinking: string;
  main_menu: string;
  call_another: string;
}> = {
  en: {
    welcome: "Welcome {name}! I am 'Centre Staff AI Assistant' 🏢. Select an option for depot management or speak into the mic:",
    call_next_label: "📢 Call Next Token",
    call_next_sub: "Call next waiting farmer to check-in gate",
    queue_label: "📊 Today's Depot Queue",
    queue_sub: "View total booked, active & done tokens",
    search_label: "🔍 Search Token Status",
    search_sub: "Search token details & farmer info",
    help_label: "🔊 Listen to Staff Help",
    help_sub: "Listen to depot staff instructions",
    help_text: "Welcome to Depot Staff Portal. Call next waiting token using green button or inspect today's queue using blue button.",
    header_title: "Centre Staff AI 🏢",
    header_subtitle: "Depot Operations & Queue Management",
    fab_title: "Centre Staff AI",
    fab_sub: "Staff Portal",
    placeholder_default: "Type token number or command...",
    placeholder_listening: "Listening... speak now",
    thinking: "Processing centre request...",
    main_menu: "🏠 Main Menu",
    call_another: "📢 Call Next Token"
  },
  hi: {
    welcome: "नमस्ते {name}! मैं हूँ 'डिपो केंद्र सहायक AI' 🏢। केंद्र संचालन हेतु विकल्प चुनें या बोलकर बताएं:",
    call_next_label: "📢 अगला टोकन बुलाएं",
    call_next_sub: "कतार में प्रतीक्षारत किसान को गेट पर बुलाएं",
    queue_label: "📊 आज की कतार स्थिति",
    queue_sub: "कुल बुक किए गए, सक्रिय और पूर्ण टोकन",
    search_label: "🔍 टोकन / किसान खोजें",
    search_sub: "विशेष टोकन नंबर की स्थिति जांचें",
    help_label: "🔊 आवाज़ से निर्देश सुनें",
    help_sub: "सहायता निर्देश सुनें",
    help_text: "डिपो स्टाफ पोर्टल में आपका स्वागत है। हरे बटन से कतार का अगला टोकन बुलाएं, और नीले बटन से आज की कतार संख्या देखें।",
    header_title: "केंद्र सहायक AI 🏢",
    header_subtitle: "डिपो प्रबंधन व कतार संचालन",
    fab_title: "केंद्र सहायक AI",
    fab_sub: "स्टाफ पोर्टल",
    placeholder_default: "टोकन नंबर या निर्देश लिखें...",
    placeholder_listening: "सुन रहा हूँ... बोलिए",
    thinking: "अनुरोध संसाधित किया जा रहा है...",
    main_menu: "🏠 मुख्य मेनू",
    call_another: "📢 एक और टोकन बुलाएं"
  },
  bn: {
    welcome: "নমস্কার {name}! আমি 'ডিপো কেন্দ্র সহায়ক AI' 🏢। ডিপো পরিচালনার জন্য একটি অপশন বেছে নিন:",
    call_next_label: "📢 পরবর্তী টোকেন ডাকুন",
    call_next_sub: "গেটে পরবর্তী অপেক্ষমাণ কৃষককে ডাকুন",
    queue_label: "📊 আজকের লাইনের অবস্থা",
    queue_sub: "মোট বুক করা, সক্রিয় এবং সম্পন্ন টোকেন",
    search_label: "🔍 টোকেন অনুসন্ধান করুন",
    search_sub: "টোকেন বিবরণ এবং কৃষকের তথ্য দেখুন",
    help_label: "🔊 ভয়েস সাহায্য শুনুন",
    help_sub: "স্টাফ নির্দেশনা শুনুন",
    help_text: "ডিপো স্টাফ পোর্টালে আপনাকে স্বাগতম। সবুজ বোতাম ব্যবহার করে পরবর্তী টোকেন ডাকুন।",
    header_title: "কেন্দ্র সহায়ক AI 🏢",
    header_subtitle: "ডিপো পরিচালনা ও লাইন ব্যবস্থাপনা",
    fab_title: "কেন্দ্র সহায়ক AI",
    fab_sub: "স্টাফ পোর্টাল",
    placeholder_default: "টোকেন নম্বর বা আদেশ লিখুন...",
    placeholder_listening: "শুনছি... কথা বলুন",
    thinking: "প্রক্রিয়াকরণ করা হচ্ছে...",
    main_menu: "🏠 প্রধান মেনু",
    call_another: "📢 পরবর্তী টোকেন ডাকুন"
  },
  mr: {
    welcome: "नमस्कार {name}! मी 'डिपो केंद्र सहाय्यक AI' 🏢 आहे. केंद्र संचालनासाठी पर्याय निवडा:",
    call_next_label: "📢 पुढील टोकन बोलवा",
    call_next_sub: "रांगेतील पुढील शेतकऱ्याला गेटवर बोलवा",
    queue_label: "📊 आजची रांग स्थिती",
    queue_sub: "एकूण बुक केलेले, सक्रिय आणि पूर्ण टोकन",
    search_label: "🔍 टोकन शोधा",
    search_sub: "विशेष टोकन क्रमांकाची माहिती तपासा",
    help_label: "🔊 आवाजात सूचना ऐका",
    help_sub: "सहाय्य सूचना ऐका",
    help_text: "डिपो कर्मचार्‍यांच्या पोर्टलवर आपले स्वागत आहे. हिरव्या बटनाने पुढील टोकन बोलवा.",
    header_title: "केंद्र सहाय्यक AI 🏢",
    header_subtitle: "डिपो व्यवस्थापन व रांग संचालन",
    fab_title: "केंद्र सहाय्यक AI",
    fab_sub: "स्टाफ पोर्टल",
    placeholder_default: "टोकन क्रमांक किंवा संदेश टाका...",
    placeholder_listening: "ऐकत आहे... बोला",
    thinking: "प्रक्रिया करत आहे...",
    main_menu: "🏠 मुख्य मेनू",
    call_another: "📢 आणखी एक टोकन बोलवा"
  },
  te: {
    welcome: "నమస్కారం {name}! నేను 'డిపో కేంద్ర సహాయక్ AI' 🏢. కేంద్ర నిర్వహణ కోసం ఒక ఆప్షన్‌ను ఎంచుకోండి:",
    call_next_label: "📢 తదుపరి టోకెన్‌ను పిలవండి",
    call_next_sub: "గేట్ వద్దకు తదుపరి రైతును పిలవండి",
    queue_label: "📊 నేటి క్యూ వివరాలు",
    queue_sub: "మొత్తం బుక్ చేసిన మరియు పూర్తయిన టోకెన్లు",
    search_label: "🔍 టోకెన్ వెతకండి",
    search_sub: "టోకెన్ వివరాలు మరియు రైతు సమాచారాన్ని తనిఖీ చేయండి",
    help_label: "🔊 వాయిస్ సూచనలను వినండి",
    help_sub: "సిబ్బంది సూచనలను వినండి",
    help_text: "డిపో స్టాఫ్ పోర్టల్‌కు స్వాగతం. ఆకుపచ్చ బటన్‌తో తదుపరి టోకెన్‌ను పిలవండి.",
    header_title: "కేంద్ర సహాయక్ AI 🏢",
    header_subtitle: "డిపో నిర్వహణ మరియు క్యూ నిర్వహణ",
    fab_title: "కేంద్ర సహాయక్ AI",
    fab_sub: "స్టాఫ్ పోర్టల్",
    placeholder_default: "టోకెన్ నంబర్ లేదా ఆదేశాన్ని నమోదు చేయండి...",
    placeholder_listening: "వింటున్నాను... మాట్లాడండి",
    thinking: "కోరిక ప్రాసెస్ చేయబడుతోంది...",
    main_menu: "🏠 ప్రధాన మెనూ",
    call_another: "📢 తదుపరి టోకెన్‌ను పిలవండి"
  },
  ta: {
    welcome: "வணக்கம் {name}! நான் 'மைய உதவியாளர் AI' 🏢. மைய நிர்வாகத்திற்கான விருப்பத்தைத் தேர்ந்தெடுக்கவும்:",
    call_next_label: "📢 அடுத்த டோக்கனை அழைக்கவும்",
    call_next_sub: "வரிசையில் உள்ள அடுத்த விவசாயியை வாயிலுக்கு அழைக்கவும்",
    queue_label: "📊 இன்றைய வரிசை நிலை",
    queue_sub: "மொத்த பதிவு மற்றும் முடிந்த டோக்கன்கள்",
    search_label: "🔍 டோக்கனைத் தேடுக",
    search_sub: "குறிப்பிட்ட டோக்கன் நிலையைச் சரிபார்க்கவும்",
    help_label: "🔊 குரல் வழிகாட்டல் கேட்க",
    help_sub: "ஊழியர் உதவி கேட்கவும்",
    help_text: "மையப் பணியாளர் போர்ட்டலுக்கு நல்வரவு. அடுத்த டோக்கனை அழைக்க பச்சை நிற பொத்தானைப் பயன்படுத்தவும்.",
    header_title: "மைய உதவியாளர் AI 🏢",
    header_subtitle: "சேமிப்புக் கிடங்கு இயக்கம் & வரிசை நிர்வாகம்",
    fab_title: "மைய உதவியாளர் AI",
    fab_sub: "பணியாளர் போர்ட்டல்",
    placeholder_default: "டோக்கன் எண் அல்லது உரையைத் தட்டச்சு செய்க...",
    placeholder_listening: "கேட்கிறது... பேசுங்கள்",
    thinking: "செயல்பாட்டில் உள்ளது...",
    main_menu: "🏠 முதன்மை மெனு",
    call_another: "📢 அடுத்த டோக்கனை அழைக்கவும்"
  },
  pa: {
    welcome: "ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ {name}! ਮੈਂ 'ਡਿਪੋ ਕੇਂਦਰ ਸਹਾਇਕ AI' 🏢 ਹਾਂ। ਕੇਂਦਰ ਪ੍ਰਬੰਧਨ ਲਈ ਵਿਕਲਪ ਚੁਣੋ:",
    call_next_label: "📢 ਅਗਲਾ ਟੋਕਨ ਬੁਲਾਓ",
    call_next_sub: "ਕਤਾਰ ਵਿੱਚ ਖੜ੍ਹੇ ਅਗਲੇ ਕਿਸਾਨ ਨੂੰ ਗੇਟ 'ਤੇ ਬੁਲਾਓ",
    queue_label: "📊 ਅੱਜ ਦੀ ਕਤਾਰ ਸਥਿਤੀ",
    queue_sub: "ਕੁੱਲ ਬੁੱਕ ਕੀਤੇ ਅਤੇ ਮੁਕੰਮਲ ਟੋਕਨ ਦੇਖੋ",
    search_label: "🔍 ਟੋਕਨ ਲੱਭੋ",
    search_sub: "ਟੋਕਨ ਨੰਬਰ ਦੀ ਸਥਿਤੀ ਚੈੱਕ ਕਰੋ",
    help_label: "🔊 ਆਵਾਜ਼ ਵਿੱਚ ਮਦਦ ਸੁਣੋ",
    help_sub: "ਸਟਾਫ਼ ਲਈ ਆਵਾਜ਼ ਵਿੱਚ ਨਿਰਦੇਸ਼",
    help_text: "ਡਿਪੋ ਸਟਾਫ਼ ਪੋਰਟਲ 'ਤੇ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ। ਹਰੇ ਬਟਨ ਨਾਲ ਅਗਲਾ ਟੋਕਨ ਬੁਲਾਓ।",
    header_title: "ਕੇਂਦਰ ਸਹਾਇਕ AI 🏢",
    header_subtitle: "ਡਿਪੋ ਪ੍ਰਬੰਧਨ ਅਤੇ ਕਤਾਰ ਪ੍ਰਬੰਧਨ",
    fab_title: "ਕੇਂਦਰ ਸਹਾਇਕ AI",
    fab_sub: "ਸਟਾਫ਼ ਪੋਰਟਲ",
    placeholder_default: "ਟੋਕਨ ਨੰਬਰ ਜਾਂ ਕਮਾਂਡ ਲਿਖੋ...",
    placeholder_listening: "ਸੁਣ ਰਿਹਾ ਹਾਂ... ਬੋਲੋ",
    thinking: "ਕਾਰਵਾਈ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ...",
    main_menu: "🏠 ਮੁੱਖ ਮੇਨੂ",
    call_another: "📢 ਇੱਕ ਹੋਰ ਟੋਕਨ ਬੁਲਾਓ"
  }
};

const CENTRE_FLOW_I18N: Record<string, {
  call_next_user_msg: string;
  no_centre_info: string;
  no_waiting_tokens: string;
  call_success: (token: number, farmer: string, crop: string, qty: number) => string;
  call_another_btn: string;
  main_menu_btn: string;
  queue_user_msg: string;
  queue_header: (centre: string) => string;
  prompt_search: string;
  no_token_found: (query: string) => string;
  search_result_text: (token: number, farmer: string, crop: string, qty: number, status: string) => string;
  call_to_gate_btn: string;
  called_to_gate_msg: (token: number) => string;
}> = {
  en: {
    call_next_user_msg: "📢 Call Next Token",
    no_centre_info: "Centre details not found.",
    no_waiting_tokens: "No waiting farmer tokens in queue currently.",
    call_success: (token, farmer, crop, qty) => `📢 Token #${token} (${farmer}, ${crop} - ${qty}kg) has been called to gate!`,
    call_another_btn: "📢 Call Next Token",
    main_menu_btn: "🏠 Main Menu",
    queue_user_msg: "📊 Today's Queue",
    queue_header: (centre) => `Live depot queue summary for ${centre}:`,
    prompt_search: "Please type the Token Number (e.g. TKT-001) below or speak into mic:",
    no_token_found: (query) => `No token or booking found matching "${query}".`,
    search_result_text: (token, farmer, crop, qty, status) => `🔍 Token Details Found:\n• Token #: ${token}\n• Farmer: ${farmer}\n• Crop: ${crop} (${qty}kg)\n• Status: ${status.toUpperCase()}`,
    call_to_gate_btn: "📢 Call to Gate",
    called_to_gate_msg: (token) => `📢 Token #${token} called to gate!`
  },
  hi: {
    call_next_user_msg: "📢 अगला टोकन बुलाएं",
    no_centre_info: "केंद्र विवरण प्राप्त नहीं हो सका।",
    no_waiting_tokens: "वर्तमान में कोई प्रतीक्षारत किसान टोकन नहीं है।",
    call_success: (token, farmer, crop, qty) => `📢 टोकन #${token} (${farmer}, ${crop} - ${qty}kg) को सफलता पूर्वक गेट पर बुलाया गया है!`,
    call_another_btn: "📢 एक और टोकन बुलाएं",
    main_menu_btn: "🏠 मुख्य मेनू",
    queue_user_msg: "📊 आज की कतार स्थिति",
    queue_header: (centre) => `आपके डिपो (${centre}) की वर्तमान कतार स्थिति:`,
    prompt_search: "कृपया टोकन नंबर (उदा. TKT-001) नीचे इनपुट बॉक्स में लिखें या बोलकर बताएं:",
    no_token_found: (query) => `कोई टोकन या रिकॉर्ड नहीं मिला जो "${query}" से मेल खाता हो।`,
    search_result_text: (token, farmer, crop, qty, status) => `🔍 टोकन विवरण मिला:\n• टोकन #: ${token}\n• किसान: ${farmer}\n• फसल: ${crop} (${qty}kg)\n• स्थिति: ${status.toUpperCase()}`,
    call_to_gate_btn: "📢 इसे गेट पर बुलाएं",
    called_to_gate_msg: (token) => `📢 टोकन #${token} को गेट पर बुलाया गया है!`
  },
  bn: {
    call_next_user_msg: "📢 পরবর্তী টোকেন ডাকুন",
    no_centre_info: "কেন্দ্রের বিবরণ পাওয়া যায়নি।",
    no_waiting_tokens: "বর্তমানে লাইনে কোনো অপেক্ষমাণ কৃষকের টোকেন নেই।",
    call_success: (token, farmer, crop, qty) => `📢 টোকেন #${token} (${farmer}, ${crop} - ${qty}kg) সফলভাবে গেটে ডাকা হয়েছে!`,
    call_another_btn: "📢 পরবর্তী টোকেন ডাকুন",
    main_menu_btn: "🏠 প্রধান মেনু",
    queue_user_msg: "📊 আজকের লাইনের অবস্থা",
    queue_header: (centre) => `আপনার ডিপোর (${centre}) বর্তমান লাইনের অবস্থা:`,
    prompt_search: "অনুগ্রহ করে টোকেন নম্বর (যেমন TKT-001) নিচে লিখুন বা মাইকে বলুন:",
    no_token_found: (query) => `"${query}" এর সাথে মেলে এমন কোনো টোকেন বা বুকিং পাওয়া যায়নি।`,
    search_result_text: (token, farmer, crop, qty, status) => `🔍 টোকেন বিবরণ পাওয়া গেছে:\n• টোকেন #: ${token}\n• কৃষক: ${farmer}\n• ফসল: ${crop} (${qty}kg)\n• অবস্থা: ${status.toUpperCase()}`,
    call_to_gate_btn: "📢 গেটে ডাকুন",
    called_to_gate_msg: (token) => `📢 টোকেন #${token} গেটে ডাকা হয়েছে!`
  },
  mr: {
    call_next_user_msg: "📢 पुढील टोकन बोलवा",
    no_centre_info: "केंद्राचा तपशील आढळला नाही.",
    no_waiting_tokens: "सध्या रांगेत कोणताही शेतकरी टोकन उपलब्ध नाही.",
    call_success: (token, farmer, crop, qty) => `📢 टोकन #${token} (${farmer}, ${crop} - ${qty}kg) गेटवर यशस्वीरित्या बोलावण्यात आले आहे!`,
    call_another_btn: "📢 आणखी एक टोकन बोलवा",
    main_menu_btn: "🏠 मुख्य मेनू",
    queue_user_msg: "📊 आजची रांग स्थिती",
    queue_header: (centre) => `तुमच्या डिपोची (${centre}) सद्य रांग स्थिती:`,
    prompt_search: "कृपया टोकन क्रमांक (उदा. TKT-001) खाली टाका किंवा बोला:",
    no_token_found: (query) => `"${query}" शी जुळणारे कोणतेही टोकन किंवा बुकिंग आढळले नाही.`,
    search_result_text: (token, farmer, crop, qty, status) => `🔍 टोकन तपशील आढळले:\n• टोकन #: ${token}\n• शेतकरी: ${farmer}\n• पीक: ${crop} (${qty}kg)\n• स्थिती: ${status.toUpperCase()}`,
    call_to_gate_btn: "📢 गेटवर बोलवा",
    called_to_gate_msg: (token) => `📢 टोकन #${token} गेटवर बोलावण्यात आले आहे!`
  },
  te: {
    call_next_user_msg: "📢 తదుపరి టోకెన్‌ను పిలవండి",
    no_centre_info: "కేంద్రం వివరాలు కనుగొనబడలేదు.",
    no_waiting_tokens: "ప్రస్తుతం క్యూలో వేచి ఉన్న రైతు టోకెన్లు ఏవీ లేవు.",
    call_success: (token, farmer, crop, qty) => `📢 టోకెన్ #${token} (${farmer}, ${crop} - ${qty}kg) గేట్ వద్దకు విజయవంతంగా పిలువబడింది!`,
    call_another_btn: "📢 తదుపరి టోకెన్‌ను పిలవండి",
    main_menu_btn: "🏠 ప్రధాన మెనూ",
    queue_user_msg: "📊 నేటి క్యూ వివరాలు",
    queue_header: (centre) => `మీ డిపో (${centre}) ప్రత్యక్ష క్యూ సమాచారం:`,
    prompt_search: "దయచేసి టోకెన్ నంబర్ (ఉదా. TKT-001) ని కింద నమోదు చేయండి లేదా మాట్లాడండి:",
    no_token_found: (query) => `"${query}" తో సరిపోలే టోకెన్ లేదా బుకింగ్ కనుగొనబడలేదు.`,
    search_result_text: (token, farmer, crop, qty, status) => `🔍 టోకెన్ వివరాలు కనుగొనబడ్డాయి:\n• టోకెన్ #: ${token}\n• రైతు: ${farmer}\n• పంట: ${crop} (${qty}kg)\n• స్థితి: ${status.toUpperCase()}`,
    call_to_gate_btn: "📢 గేట్ వద్దకు పిలవండి",
    called_to_gate_msg: (token) => `📢 టోకెన్ #${token} గేట్ వద్దకు పిలువబడింది!`
  },
  ta: {
    call_next_user_msg: "📢 அடுத்த டோக்கனை அழைக்கவும்",
    no_centre_info: "மைய விவரங்கள் காணப்படவில்லை.",
    no_waiting_tokens: "தற்போது வரிசையில் காத்திருக்கும் விவசாயி டோக்கன் எதுவும் இல்லை.",
    call_success: (token, farmer, crop, qty) => `📢 டோக்கன் #${token} (${farmer}, ${crop} - ${qty}kg) வெற்றிகரமாக வாயிலுக்கு அழைக்கப்பட்டது!`,
    call_another_btn: "📢 அடுத்த டோக்கனை அழைக்கவும்",
    main_menu_btn: "🏠 முதன்மை மெனு",
    queue_user_msg: "📊 இன்றைய வரிசை நிலை",
    queue_header: (centre) => `உங்கள் சேமிப்புக் கிடங்கின் (${centre}) தற்போதைய வரிசை நிலை:`,
    prompt_search: "தயவுசெய்து டோக்கன் எண்ணை (எ.கா. TKT-001) கீழே தட்டச்சு செய்யவும் அல்லது பேசவும்:",
    no_token_found: (query) => `"${query}" உடன் பொருந்தக்கூடிய டோக்கன் எதுவும் கிடைக்கவில்லை.`,
    search_result_text: (token, farmer, crop, qty, status) => `🔍 டோக்கன் விவரங்கள் கிடைக்கப்பெற்றன:\n• டோக்கன் #: ${token}\n• விவசாயி: ${farmer}\n• பயிர்: ${crop} (${qty}kg)\n• நிலை: ${status.toUpperCase()}`,
    call_to_gate_btn: "📢 வாயிலுக்கு அழைக்கவும்",
    called_to_gate_msg: (token) => `📢 டோக்கன் #${token} வாயிலுக்கு அழைக்கப்பட்டது!`
  },
  pa: {
    call_next_user_msg: "📢 ਅਗਲਾ ਟੋਕਨ ਬੁਲਾਓ",
    no_centre_info: "ਕੇਂਦਰ ਵੇਰਵਾ ਨਹੀਂ ਮਿਲਿਆ।",
    no_waiting_tokens: "ਵਰਤਮਾਨ ਵਿੱਚ ਕਤਾਰ ਵਿੱਚ ਕੋਈ ਕਿਸਾਨ ਟੋਕਨ ਨਹੀਂ ਹੈ।",
    call_success: (token, farmer, crop, qty) => `📢 ਟੋਕਨ #${token} (${farmer}, ${crop} - ${qty}kg) ਨੂੰ ਸਫਲਤਾਪੂਰਵਕ ਗੇਟ 'ਤੇ ਬੁਲਾਇਆ ਗਿਆ ਹੈ!`,
    call_another_btn: "📢 ਅਗਲਾ ਟੋਕਨ ਬੁਲਾਓ",
    main_menu_btn: "🏠 ਮੁੱਖ ਮੇਨੂ",
    queue_user_msg: "📊 ਅੱਜ ਦੀ ਕਤਾਰ ਸਥਿਤੀ",
    queue_header: (centre) => `ਤੁਹਾਡੇ ਡਿਪੋ (${centre}) ਦੀ ਵਰਤਮਾਨ ਕਤਾਰ ਸਥਿਤੀ:`,
    prompt_search: "ਕਿਰਪਾ ਕਰਕੇ ਟੋਕਨ ਨੰਬਰ (ਜਿਵੇਂ TKT-001) ਹੇਠਾਂ ਲਿਖੋ ਜਾਂ ਬੋਲੋ:",
    no_token_found: (query) => `"${query}" ਨਾਲ ਮੇਲ ਖਾਂਦਾ ਕੋਈ ਟੋਕਨ ਜਾਂ ਬੁਕਿੰਗ ਨਹੀਂ ਮਿਲੀ।`,
    search_result_text: (token, farmer, crop, qty, status) => `🔍 ਟੋਕਨ ਵੇਰਵਾ ਮਿਲਿਆ:\n• ਟੋਕਨ #: ${token}\n• ਕਿਸਾਨ: ${farmer}\n• ਫ਼ਸਲ: ${crop} (${qty}kg)\n• ਸਥਿਤੀ: ${status.toUpperCase()}`,
    call_to_gate_btn: "📢 ਗੇਟ 'ਤੇ ਬੁਲਾਓ",
    called_to_gate_msg: (token) => `📢 ਟੋਕਨ #${token} ਗੇਟ 'ਤੇ ਬੁਲਾਇਆ ਗਿਆ ਹੈ!`
  }
};

const getCentreFlowI18n = (lang: string) => {
  const langKey = (lang || 'hi').split('-')[0].toLowerCase();
  return CENTRE_FLOW_I18N[langKey] || CENTRE_FLOW_I18N['en'] || CENTRE_FLOW_I18N['hi'];
};

export const CentreAgentWidget: React.FC = () => {
  const { i18n } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [staffName, setStaffName] = useState('Staff');
  const [centreInfo, setCentreInfo] = useState<any>(null);
  const [messages, setMessages] = useState<StaffAgentMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);

  // Audio Speech Synthesis & Voice Recognition
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const prevLangRef = useRef<string>(i18n.language);

  // Initialize Session and Staff Details
  const fetchCentreInfo = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('name')
          .eq('id', currentSession.user.id)
          .single();
        if (profile?.name) setStaffName(profile.name);

        // 1. Try staff table mapping first (matches CentreDashboard logic)
        const { data: staffRow } = await supabase
          .from('staff')
          .select('centre_id, procurement_centres(id, name)')
          .eq('user_id', currentSession.user.id)
          .maybeSingle();

        if (staffRow?.centre_id) {
          const centreName = (staffRow.procurement_centres as any)?.name || 'Depot';
          const info = { id: staffRow.centre_id, name: centreName };
          setCentreInfo(info);
          return info;
        }

        // 2. Fallback to owner_id on procurement_centres
        const { data: centreRow } = await supabase
          .from('procurement_centres')
          .select('id, name')
          .eq('owner_id', currentSession.user.id)
          .maybeSingle();

        if (centreRow) {
          const info = { id: centreRow.id, name: centreRow.name };
          setCentreInfo(info);
          return info;
        }
      }
    } catch (err) {
      console.error('Error fetching centre info in CentreAgentWidget:', err);
    }
    return null;
  };

  useEffect(() => {
    fetchCentreInfo();
  }, []);

  // Monitor i18n language changes and refresh agent messages instantly in current language
  useEffect(() => {
    if (isOpen) {
      if (prevLangRef.current !== i18n.language || messages.length === 0) {
        prevLangRef.current = i18n.language;
        stopSpeaking();
        setMessages([]);
        showRootMenu();
      }
    }
  }, [i18n.language, isOpen]);

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

  // Multilanguage Speech-to-Text (STT) with Mic Permission & Real-Time Transcript
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
          ? '⚠️ आपका ब्राउज़र आवाज़ पहचानने (Speech Recognition) का समर्थन नहीं करता है। कृपया Chrome या Edge का उपयोग करें।' 
          : '⚠️ Speech recognition is not supported in this browser. Please use Chrome or Edge.',
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
              ? '🎙️ ऑनलाइन स्पीच सेवा उपलब्ध नहीं है। कृपया नीचे दिए गए विकल्पों में से चुनें या इनपुट में लिखें:' 
              : '🎙️ Browser speech cloud service unreachable. Please select a staff command below or type your query:',
            [
              {
                id: 'v_call_next',
                label: isHi ? '📢 अगला टोकन बुलाएं' : '📢 Call Next Token',
                action: () => callNextToken()
              },
              {
                id: 'v_queue_summary',
                label: isHi ? '📊 आज की कतार स्थिति' : '📊 Today\'s Queue',
                action: () => showTodayQueueSummary()
              },
              {
                id: 'v_search_token',
                label: isHi ? '🔍 टोकन / किसान खोजें' : '🔍 Search Token Status',
                action: () => promptSearchToken()
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
      addAgentMessage(
        isHi
          ? '🎤 माइक प्रारंभ नहीं हो सका। कृपया पुनः प्रयास करें।'
          : '🎤 Unable to start mic. Please try again.',
        undefined, undefined, undefined, false
      );
    }
  };

  const addAgentMessage = (
    text: string,
    options?: StaffAgentMessage['options'],
    cardType?: StaffAgentMessage['cardType'],
    cardData?: any,
    autoSpeak: boolean = true
  ) => {
    const newMsg: StaffAgentMessage = {
      id: Date.now().toString() + Math.random(),
      sender: 'agent',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      options,
      cardType,
      cardData
    };
    setMessages((prev) => [...prev, newMsg]);
    if (autoSpeak) speakText(text);
  };

  const addUserMessage = (text: string) => {
    const newMsg: StaffAgentMessage = {
      id: Date.now().toString() + Math.random(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  // Staff Root Menu
  const showRootMenu = () => {
    stopSpeaking();

    const langKey = (i18n.language || 'hi').split('-')[0].toLowerCase();
    const dict = CENTRE_AGENT_I18N[langKey] || CENTRE_AGENT_I18N['en'] || CENTRE_AGENT_I18N['hi'];
    const welcomeTitle = dict.welcome.replace('{name}', staffName);

    const rootOptions = [
      {
        id: 'opt_call_next',
        label: `1️⃣ ${dict.call_next_label}`,
        sublabel: dict.call_next_sub,
        color: 'emerald',
        action: () => callNextToken()
      },
      {
        id: 'opt_queue_summary',
        label: `2️⃣ ${dict.queue_label}`,
        sublabel: dict.queue_sub,
        color: 'blue',
        action: () => showTodayQueueSummary()
      },
      {
        id: 'opt_search_token',
        label: `3️⃣ ${dict.search_label}`,
        sublabel: dict.search_sub,
        color: 'amber',
        action: () => promptSearchToken()
      },
      {
        id: 'opt_staff_help',
        label: `4️⃣ ${dict.help_label}`,
        sublabel: dict.help_sub,
        color: 'purple',
        action: () => speakText(dict.help_text)
      }
    ];

    addAgentMessage(welcomeTitle, rootOptions, undefined, undefined, true);
  };

  // Call Next Token Action
  const callNextToken = async () => {
    stopSpeaking();
    const txt = getCentreFlowI18n(i18n.language);
    addUserMessage(txt.call_next_user_msg);

    let activeCentre = centreInfo;
    if (!activeCentre?.id) {
      activeCentre = await fetchCentreInfo();
    }

    if (!activeCentre?.id) {
      addAgentMessage(txt.no_centre_info);
      return;
    }

    setLoading(true);

    try {
      // Find oldest 'booked' status token for this centre
      const { data: waitingTokens, error } = await supabase
        .from('bookings')
        .select('id, token, product_name, quantity, users(name)')
        .eq('centre_id', activeCentre.id)
        .eq('status', 'booked')
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) throw error;

      if (!waitingTokens || waitingTokens.length === 0) {
        addAgentMessage(
          txt.no_waiting_tokens,
          [{ id: 'main_m', label: txt.main_menu_btn, action: () => showRootMenu() }]
        );
        setLoading(false);
        return;
      }

      const nextToken = waitingTokens[0];
      const farmerNameStr = (nextToken.users as any)?.name || 'Farmer';

      // Update status to 'called'
      const { error: updateErr } = await supabase
        .from('bookings')
        .update({ status: 'called' })
        .eq('id', nextToken.id);

      if (updateErr) throw updateErr;

      addAgentMessage(
        txt.call_success(nextToken.token, farmerNameStr, nextToken.product_name, nextToken.quantity),
        [
          {
            id: 'call_another',
            label: txt.call_another_btn,
            color: 'emerald',
            action: () => callNextToken()
          },
          {
            id: 'main_m',
            label: txt.main_menu_btn,
            action: () => showRootMenu()
          }
        ],
        'call_success',
        {
          token: nextToken.token,
          farmerName: farmerNameStr,
          crop: nextToken.product_name,
          qty: nextToken.quantity
        }
      );
    } catch (e: any) {
      console.error(e);
      addAgentMessage(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Today's Queue Summary
  const showTodayQueueSummary = async () => {
    stopSpeaking();
    const txt = getCentreFlowI18n(i18n.language);
    addUserMessage(txt.queue_user_msg);

    let activeCentre = centreInfo;
    if (!activeCentre?.id) {
      activeCentre = await fetchCentreInfo();
    }

    if (!activeCentre?.id) {
      addAgentMessage(txt.no_centre_info);
      return;
    }

    setLoading(true);

    try {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('status, token')
        .eq('centre_id', activeCentre.id);

      const total = bookings?.length || 0;
      const booked = bookings?.filter((b) => b.status === 'booked').length || 0;
      const active = bookings?.filter((b) => b.status === 'called' || b.status === 'in_progress').length || 0;
      const done = bookings?.filter((b) => b.status === 'completed').length || 0;

      addAgentMessage(
        txt.queue_header(activeCentre.name),
        [{ id: 'main_m', label: txt.main_menu_btn, action: () => showRootMenu() }],
        'queue_summary',
        { total, booked, active, done }
      );
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const promptSearchToken = () => {
    const txt = getCentreFlowI18n(i18n.language);
    addAgentMessage(txt.prompt_search);
  };

  const searchTokenDetails = async (queryStr: string) => {
    stopSpeaking();
    const txt = getCentreFlowI18n(i18n.language);

    let activeCentre = centreInfo;
    if (!activeCentre?.id) {
      activeCentre = await fetchCentreInfo();
    }

    if (!activeCentre?.id) {
      addAgentMessage(txt.no_centre_info);
      return;
    }

    setLoading(true);

    try {
      const cleanQuery = queryStr.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
      const { data: matches, error } = await supabase
        .from('bookings')
        .select('id, token, product_name, quantity, status, users(name, mobile_number)')
        .eq('centre_id', activeCentre.id)
        .or(`token.ilike.%${cleanQuery}%,product_name.ilike.%${cleanQuery}%`)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      if (!matches || matches.length === 0) {
        addAgentMessage(
          txt.no_token_found(queryStr),
          [{ id: 'main_m', label: txt.main_menu_btn, action: () => showRootMenu() }]
        );
        return;
      }

      const match = matches[0];
      const farmerNameStr = (match.users as any)?.name || 'Farmer';

      addAgentMessage(
        txt.search_result_text(match.token, farmerNameStr, match.product_name, match.quantity, match.status),
        [
          ...(match.status === 'booked' ? [{
            id: 'call_this',
            label: txt.call_to_gate_btn,
            color: 'emerald',
            action: async () => {
              await supabase.from('bookings').update({ status: 'called' }).eq('id', match.id);
              addAgentMessage(txt.called_to_gate_msg(match.token));
            }
          }] : []),
          { id: 'main_m', label: txt.main_menu_btn, action: () => showRootMenu() }
        ]
      );
    } catch (e: any) {
      console.error(e);
      addAgentMessage(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text) return;

    addUserMessage(text);
    setInputVal('');

    const lower = text.toLowerCase();

    // 1. Multi-language option number matching (1, 2, 3, "one", "एक", "১", "१", "ఒకటి", "ஒன்று", "ਇੱਕ")
    const numChoice = parseNumberFromText(text);
    if (numChoice !== null) {
      const lastAgentMsg = [...messages].reverse().find(m => m.sender === 'agent' && m.options && m.options.length > 0);
      if (lastAgentMsg && lastAgentMsg.options) {
        const idx = numChoice - 1;
        if (idx >= 0 && idx < lastAgentMsg.options.length) {
          lastAgentMsg.options[idx].action();
          return;
        }
      }
    }

    if (
      lower.includes('call') || lower.includes('next') || lower.includes('बुलाएं') || 
      lower.includes('अगला') || lower.includes('ডাকুন') || lower.includes('बोलवा') || 
      lower.includes('పిలవండి') || lower.includes('அழைக்க') || lower.includes('ਬੁਲਾਓ')
    ) {
      callNextToken();
    } else if (
      lower.includes('summary') || lower.includes('queue') || lower.includes('कतार') || 
      lower.includes('स्थिति') || lower.includes('লাইন') || lower.includes('रांग') || 
      lower.includes('క్యూ') || lower.includes('வரிசை') || lower.includes('<ctrl42>ਕਤਾਰ')
    ) {
      showTodayQueueSummary();
    } else if (/\d+/.test(text) || lower.includes('tkt') || lower.includes('token') || lower.includes('टोकन')) {
      searchTokenDetails(text);
    } else {
      showRootMenu();
    }
  };

  const currentLang = (i18n.language || 'hi').split('-')[0].toLowerCase();
  const dict = CENTRE_AGENT_I18N[currentLang] || CENTRE_AGENT_I18N['en'] || CENTRE_AGENT_I18N['hi'];

  return (
    <>
      {/* FAB FOR CENTRE STAFF AGENT */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open Centre Staff Assistant AI"
            className="flex items-center gap-3 bg-gradient-to-r from-indigo-700 via-indigo-800 to-blue-900 text-white px-5 py-3.5 rounded-full shadow-xl hover:scale-105 transition-all duration-300 ring-4 ring-indigo-400/30 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <Building2 className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">
                {dict.fab_sub}
              </div>
              <div className="text-sm font-extrabold flex items-center gap-1.5">
                <span>{dict.fab_title}</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </div>
            </div>
          </button>
        )}
      </div>

      {/* DRAWER MODAL FOR STAFF AGENT */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 transition-all">
          <div className="w-full max-w-xl bg-white h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-indigo-100 animate-in fade-in slide-in-from-bottom-5 duration-300">
            
            {/* HEADER */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-4 text-white flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
                  <Building2 className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-white">{dict.header_title}</h2>
                  <p className="text-xs text-indigo-200 font-medium">{dict.header_subtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isSpeaking && (
                  <button onClick={stopSpeaking} className="p-2 rounded-xl bg-red-500/30 text-white">
                    <VolumeX className="w-5 h-5" />
                  </button>
                )}
                <button onClick={showRootMenu} className="p-2 rounded-xl bg-white/10 text-white cursor-pointer">
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button onClick={() => { stopSpeaking(); setIsOpen(false); }} className="p-2 rounded-xl bg-white/10 text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70">
              {messages.map((msg) => {
                const isAgent = msg.sender === 'agent';
                return (
                  <div key={msg.id} className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'} space-y-2`}>
                    <div className={`max-w-[90%] p-4 rounded-2xl shadow-xs text-sm ${isAgent ? 'bg-white border border-indigo-100 text-slate-800 rounded-tl-xs' : 'bg-indigo-600 text-white font-medium rounded-tr-xs'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                        {isAgent && (
                          <button onClick={() => speakText(msg.text)} className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 cursor-pointer">
                            <Volume2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="text-[10px] mt-1.5 font-semibold text-slate-400">{msg.timestamp}</div>
                    </div>

                    {/* OPTIONS */}
                    {msg.options && (
                      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {msg.options.map((opt) => (
                          <button key={opt.id} onClick={opt.action} className="p-3.5 rounded-2xl border bg-white hover:bg-slate-100 text-left cursor-pointer">
                            <div className="font-extrabold text-sm text-slate-900">{opt.label}</div>
                            {opt.sublabel && <div className="text-xs text-slate-500 mt-0.5">{opt.sublabel}</div>}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* QUEUE SUMMARY CARD */}
                    {msg.cardType === 'queue_summary' && msg.cardData && (
                      <div className="w-full bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-3 mt-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                          <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                            <span className="text-xs text-slate-500 font-bold block uppercase">Total</span>
                            <span className="text-lg font-black text-slate-900">{msg.cardData.total}</span>
                          </div>
                          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                            <span className="text-xs text-amber-700 font-bold block uppercase">Waiting</span>
                            <span className="text-lg font-black text-amber-900">{msg.cardData.booked}</span>
                          </div>
                          <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                            <span className="text-xs text-blue-700 font-bold block uppercase">Called</span>
                            <span className="text-lg font-black text-blue-900">{msg.cardData.active}</span>
                          </div>
                          <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                            <span className="text-xs text-emerald-700 font-bold block uppercase">Done</span>
                            <span className="text-lg font-black text-emerald-900">{msg.cardData.done}</span>
                          </div>
                        </div>

                        {/* Visual Progress Meter Bar */}
                        {msg.cardData.total > 0 && (
                          <div className="bg-white p-3 rounded-xl border border-indigo-100 space-y-1.5">
                            <div className="flex justify-between text-xs font-bold text-slate-700">
                              <span>Intake Completion Rate</span>
                              <span className="text-emerald-700">
                                {Math.round((msg.cardData.done / msg.cardData.total) * 100)}% Completed
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                              <div 
                                style={{ width: `${(msg.cardData.done / msg.cardData.total) * 100}%` }}
                                className="bg-emerald-500 h-full"
                              />
                              <div 
                                style={{ width: `${(msg.cardData.active / msg.cardData.total) * 100}%` }}
                                className="bg-blue-500 h-full"
                              />
                              <div 
                                style={{ width: `${(msg.cardData.booked / msg.cardData.total) * 100}%` }}
                                className="bg-amber-400 h-full"
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 pt-0.5">
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"/> Done</span>
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"/> Serving</span>
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"/> Waiting</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CALL SUCCESS CARD */}
                    {msg.cardType === 'call_success' && msg.cardData && (
                      <div className="w-full bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 space-y-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="px-2.5 py-0.5 bg-emerald-600 text-white font-black text-xs rounded-full">NOW CALLED</span>
                          <span className="text-2xl font-black text-emerald-900">#{msg.cardData.token}</span>
                        </div>
                        <div className="text-xs font-bold text-slate-700">
                          Farmer: {msg.cardData.farmerName} • Crop: {msg.cardData.crop} ({msg.cardData.qty}kg)
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
              {loading && <div className="text-xs text-slate-400 p-2 font-semibold">{dict.thinking}</div>}
              <div ref={messagesEndRef} />
            </div>

            {/* FOOTER */}
            <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
              <button
                onClick={toggleListening}
                className={`p-3 rounded-2xl transition-all cursor-pointer ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-100 text-indigo-900'}`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={isListening ? dict.placeholder_listening : dict.placeholder_default}
                className="flex-1 bg-slate-100 text-slate-900 text-sm px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!inputVal.trim()}
                className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl cursor-pointer disabled:opacity-40"
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

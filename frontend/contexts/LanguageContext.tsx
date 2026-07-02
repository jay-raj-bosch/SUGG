import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePlant } from "@/contexts/PlantContext";

export type Language = "kannada" | "tamil" | "hindi" | "telugu";

export const translations: Record<string, Record<Language, string>> = {
  // ── Employee page headings ──
  "New Suggestion": { kannada: "ಹೊಸ ಸಲಹೆ", tamil: "புதிய பரிந்துரை", hindi: "नई सुझाव", telugu: "కొత్త సూచన" },
  "Copy Suggestion": { kannada: "ಸಲಹೆ ನಕಲು", tamil: "பரிந்துரை நகல்", hindi: "सुझाव कॉपी", telugu: "సూచన కాపీ" },
  "My Pending": { kannada: "ನನ್ನ ಬಾಕಿ", tamil: "எனது நிலுவை", hindi: "मेरे लंबित", telugu: "నా పెండింగ్" },
  "Pending Evaluation": { kannada: "ಮೌಲ್ಯಮಾಪನ ಬಾಕಿ", tamil: "மதிப்பீடு நிலுவை", hindi: "मूल्यांकन लंबित", telugu: "మూల్యాంకనం పెండింగ్" },
  "My Suggestions": { kannada: "ನನ್ನ ಸಲಹೆಗಳು", tamil: "எனது பரிந்துரைகள்", hindi: "मेरे सुझाव", telugu: "నా సూచనలు" },
  "My Awards": { kannada: "ನನ್ನ ಪ್ರಶಸ್ತಿಗಳು", tamil: "எனது விருதுகள்", hindi: "मेरे पुरस्कार", telugu: "నా అవార్డులు" },
  "Procedure": { kannada: "ಕಾರ್ಯವಿಧಾನ", tamil: "நடைமுறை", hindi: "प्रक्रिया", telugu: "విధానం" },
  "Suggestion Scheme Procedure": { kannada: "ಸಲಹೆ ಯೋಜನೆ ಕಾರ್ಯವಿಧಾನ", tamil: "பரிந்துரை திட்ட நடைமுறை", hindi: "सुझाव योजना प्रक्रिया", telugu: "సూచన పథకం విధానం" },
  "Employee Home": { kannada: "ಮುಖಪುಟ", tamil: "முகப்பு", hindi: "मुखपृष्ठ", telugu: "హోమ్" },

  // ── Admin page headings ──
  "Assign Authority": { kannada: "ಅಧಿಕಾರ ನಿಯೋಜಿಸಿ", tamil: "அதிகாரம் ஒதுக்கு", hindi: "प्राधिकार नियुक्त करें", telugu: "అధికారం కేటాయించు" },
  "General Enquiry": { kannada: "ಸಾಮಾನ್ಯ ವಿಚಾರಣೆ", tamil: "பொது விசாரணை", hindi: "सामान्य पूछताछ", telugu: "సాధారణ విచారణ" },

  "NEFT / MIS Report": { kannada: "NEFT/MIS ವರದಿ", tamil: "NEFT/MIS அறிக்கை", hindi: "NEFT/MIS रिपोर्ट", telugu: "NEFT/MIS నివేదిక" },
  "MIS Graphical Report": { kannada: "MIS ಗ್ರಾಫಿಕಲ್ ವರದಿ", tamil: "MIS வரைபட அறிக்கை", hindi: "MIS ग्राफिकल रिपोर्ट", telugu: "MIS గ్రాఫికల్ నివేదిక" },
  "Add Department Mapping": { kannada: "ಇಲಾಖೆ ಮ್ಯಾಪಿಂಗ್ ಸೇರಿಸಿ", tamil: "துறை வரைபடம் சேர்", hindi: "विभाग मैपिंग जोड़ें", telugu: "విభాగం మ్యాపింగ్ జోడించు" },
  "Category Master": { kannada: "ವರ್ಗ ಮಾಸ್ಟರ್", tamil: "வகை மாஸ்டர்", hindi: "श्रेणी मास्टर", telugu: "వర్గం మాస్టర్" },
  "Transfer Suggestion": { kannada: "ಸಲಹೆ ವರ್ಗಾವಣೆ", tamil: "பரிந்துரை மாற்றம்", hindi: "सुझाव स्थानांतरण", telugu: "సూచన బదిలీ" },
  "Reopen Rejected Suggestion": { kannada: "ತಿರಸ್ಕೃತ ಸಲಹೆ ಪುನರಾರಂಭ", tamil: "நிராகரிக்கப்பட்ட பரிந்துரை மறுதொடக்கம்", hindi: "अस्वीकृत सुझाव पुनः खोलें", telugu: "తిరస్కరించబడిన సూచన తిరిగి తెరవండి" },
  "Award Letter": { kannada: "ಪ್ರಶಸ್ತಿ ಪತ್ರ", tamil: "விருது கடிதம்", hindi: "पुरस्कार पत्र", telugu: "అవార్డు లేఖ" },

  // ── Sidebar ──
  "Employee Menu": { kannada: "ಉದ್ಯೋಗಿ ಮೆನು", tamil: "பணியாளர் மெனு", hindi: "कर्मचारी मेनू", telugu: "ఉద్యోగి మెనూ" },
  "Admin Module": { kannada: "ನಿರ್ವಾಹಕ ಮಾಡ್ಯೂಲ್", tamil: "நிர்வாக தொகுதி", hindi: "व्यवस्थापक मॉड्यूल", telugu: "అడ్మిన్ మాడ్యూల్" },
  "Back to Portal": { kannada: "ಪೋರ್ಟಲ್‌ಗೆ ಹಿಂತಿರುಗಿ", tamil: "போர்ட்டலுக்கு திரும்பு", hindi: "पोर्टल पर वापस", telugu: "పోర్టల్‌కు తిరిగి" },
  "Suggestion Management System": { kannada: "ಸಲಹೆ ನಿರ್ವಹಣೆ ವ್ಯವಸ್ಥೆ", tamil: "பரிந்துரை மேலாண்மை அமைப்பு", hindi: "सुझाव प्रबंधन प्रणाली", telugu: "సూచన నిర్వహణ వ్యవస్థ" },
  "Home": { kannada: "ಮುಖಪುಟ", tamil: "முகப்பு", hindi: "होम", telugu: "హోమ్" },

  // ── Form field labels (Global) ──
  "Type of Suggestion": { kannada: "ಸಲಹೆಯ ಪ್ರಕಾರ", tamil: "பரிந்துரை வகை", hindi: "सुझाव का प्रकार", telugu: "సూచన రకం" },
  "Suggestion Date": { kannada: "ಸಲಹೆ ದಿನಾಂಕ", tamil: "பரிந்துரை தேதி", hindi: "सुझाव तिथि", telugu: "సూచన తేదీ" },
  "Range": { kannada: "ಶ್ರೇಣಿ", tamil: "வரம்பு", hindi: "श्रेणी", telugu: "శ్రేణి" },
  "Suggestion For": { kannada: "ಸಲಹೆ ಯಾರಿಗಾಗಿ", tamil: "பரிந்துரை யாருக்கு", hindi: "सुझाव किसके लिए", telugu: "సూచన ఎవరికి" },
  "Self": { kannada: "ಸ್ವಂತ", tamil: "சுய", hindi: "स्वयं", telugu: "స్వయం" },
  "On Behalf": { kannada: "ಪರವಾಗಿ", tamil: "சார்பாக", hindi: "की ओर से", telugu: "తరఫున" },
  "Group Suggestion": { kannada: "ಗುಂಪು ಸಲಹೆ", tamil: "குழு பரிந்துரை", hindi: "समूह सुझाव", telugu: "గ్రూప్ సూచన" },
  "Yes": { kannada: "ಹೌದು", tamil: "ஆம்", hindi: "हाँ", telugu: "అవును" },
  "No": { kannada: "ಇಲ್ಲ", tamil: "இல்லை", hindi: "नहीं", telugu: "కాదు" },
  "Other Info": { kannada: "ಇತರ ಮಾಹಿತಿ", tamil: "பிற தகவல்", hindi: "अन्य जानकारी", telugu: "ఇతర సమాచారం" },
  "Attachments": { kannada: "ಲಗತ್ತುಗಳು", tamil: "இணைப்புகள்", hindi: "संलग्नक", telugu: "జోడింపులు" },
  "Save Draft": { kannada: "ಕರಡು ಉಳಿಸಿ", tamil: "வரைவு சேமி", hindi: "ड्राफ्ट सहेजें", telugu: "డ్రాఫ్ట్ సేవ్" },
  "Submit": { kannada: "ಸಲ್ಲಿಸಿ", tamil: "சமர்ப்பி", hindi: "जमा करें", telugu: "సమర్పించు" },
  "Reset": { kannada: "ಮರುಹೊಂದಿಸಿ", tamil: "மீட்டமை", hindi: "रीसेट", telugu: "రీసెట్" },
  "Search": { kannada: "ಹುಡುಕಿ", tamil: "தேடு", hindi: "खोजें", telugu: "శోధించు" },
  "View": { kannada: "ವೀಕ್ಷಿಸಿ", tamil: "காண்க", hindi: "देखें", telugu: "చూడండి" },

  // ── Simple Suggestion fields ──
  "Suggestion Subject": { kannada: "ಸಲಹೆ ವಿಷಯ", tamil: "பரிந்துரை தலைப்பு", hindi: "सुझाव विषय", telugu: "సూచన విషయం" },
  "Category": { kannada: "ವರ್ಗ", tamil: "வகை", hindi: "श्रेणी", telugu: "వర్గం" },
  "Details of present Method": { kannada: "ಪ್ರಸ್ತುತ ವಿಧಾನದ ವಿವರಗಳು", tamil: "தற்போதைய முறையின் விவரங்கள்", hindi: "वर्तमान विधि का विवरण", telugu: "ప్రస్తుత పద్ధతి వివరాలు" },
  "Details of proposed Method": { kannada: "ಉದ್ದೇಶಿತ ವಿಧಾನದ ವಿವರಗಳು", tamil: "முன்மொழியப்பட்ட முறையின் விவரங்கள்", hindi: "प्रस्तावित विधि का विवरण", telugu: "ప్రతిపాదిత పద్ధతి వివరాలు" },
  "Benefits": { kannada: "ಪ್ರಯೋಜನಗಳು", tamil: "நன்மைகள்", hindi: "लाभ", telugu: "ప్రయోజనాలు" },
  "Select Approver": { kannada: "ಅನುಮೋದಕ ಆಯ್ಕೆಮಾಡಿ", tamil: "அங்கீகாரி தேர்வு", hindi: "अनुमोदक चुनें", telugu: "ఆమోదకుడిని ఎంచుకోండి" },

  // ── Shop Floor CIP fields ──
  "Date of Implementation": { kannada: "ಅನುಷ್ಠಾನ ದಿನಾಂಕ", tamil: "செயல்படுத்திய தேதி", hindi: "कार्यान्वयन तिथि", telugu: "అమలు తేదీ" },
  "Team Members": { kannada: "ತಂಡದ ಸದಸ್ಯರು", tamil: "குழு உறுப்பினர்கள்", hindi: "टीम के सदस्य", telugu: "బృంద సభ్యులు" },
  "Name of Moderator": { kannada: "ಮಧ್ಯಸ್ಥಿಕೆದಾರರ ಹೆಸರು", tamil: "நடுவர் பெயர்", hindi: "मॉडरेटर का नाम", telugu: "మోడరేటర్ పేరు" },
  "Kaizen Theme": { kannada: "ಕೈಝೆನ್ ವಿಷಯ", tamil: "கைசென் கருப்பொருள்", hindi: "काइज़ेन विषय", telugu: "కైజెన్ థీమ్" },
  "Problem / Present Status": { kannada: "ಸಮಸ್ಯೆ / ಪ್ರಸ್ತುತ ಸ್ಥಿತಿ", tamil: "சிக்கல் / தற்போதைய நிலை", hindi: "समस्या / वर्तमान स्थिति", telugu: "సమస్య / ప్రస్తుత స్థితి" },
  "Before Improvement": { kannada: "ಸುಧಾರಣೆಗೆ ಮುಂಚೆ", tamil: "முன்னேற்றத்திற்கு முன்", hindi: "सुधार से पहले", telugu: "మెరుగుదలకు ముందు" },
  "After Improvement": { kannada: "ಸುಧಾರಣೆಯ ನಂತರ", tamil: "முன்னேற்றத்திற்கு பின்", hindi: "सुधार के बाद", telugu: "మెరుగుదల తర్వాత" },
  "Real Root Cause Identification": { kannada: "ನಿಜವಾದ ಮೂಲ ಕಾರಣ ಗುರುತಿಸುವಿಕೆ", tamil: "உண்மையான மூல காரணம் கண்டறிதல்", hindi: "वास्तविक मूल कारण पहचान", telugu: "నిజమైన మూల కారణం గుర్తింపు" },
  "Standardization": { kannada: "ಪ್ರಮಾಣೀಕರಣ", tamil: "தரநிலைப்படுத்தல்", hindi: "मानकीकरण", telugu: "ప్రమాణీకరణ" },
  "Root Cause": { kannada: "ಮೂಲ ಕಾರಣ", tamil: "மூல காரணம்", hindi: "मूल कारण", telugu: "మూల కారణం" },
  "Idea to Eliminate Root Cause": { kannada: "ಮೂಲ ಕಾರಣ ನಿವಾರಣೆ ಯೋಚನೆ", tamil: "மூல காரணத்தை நீக்கும் யோசனை", hindi: "मूल कारण दूर करने का विचार", telugu: "మూల కారణం తొలగించే ఆలోచన" },
  "Action Taken": { kannada: "ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳಲಾಗಿದೆ", tamil: "நடவடிக்கை எடுக்கப்பட்டது", hindi: "की गई कार्रवाई", telugu: "తీసుకున్న చర్య" },
  "Horizontal Deployment Count": { kannada: "ಈ ಸುಧಾರಣೆಯನ್ನು ಎಷ್ಟು ಸ್ಥಳಗಳಲ್ಲಿ ಸಮತಲದಲ್ಲಿ ನಿಯೋಜಿಸಲಾಗಿದೆ", tamil: "கிடைமட்ட பயன்பாட்டு எண்ணிக்கை", hindi: "क्षैतिज तैनाती गिनती", telugu: "క్షితిజ సమాంతర విస్తరణ సంఖ్య" },

  // ── My Idea Card fields ──
  "Description – Idea / Problem": { kannada: "ವಿವರಣೆ – ಐಡಿಯಾ / ಸಮಸ್ಯೆ", tamil: "விளக்கம் – யோசனை / சிக்கல்", hindi: "विवरण – विचार / समस्या", telugu: "వివరణ – ఆలోచన / సమస్య" },
  "Description – Improvement Done": { kannada: "ವಿವರಣೆ – ಸುಧಾರಣೆ ಮಾಡಲಾಗಿದೆ", tamil: "விளக்கம் – மேம்பாடு செய்யப்பட்டது", hindi: "विवरण – सुधार किया गया", telugu: "వివరణ – చేసిన మెరుగుదల" },

  // ── Daily CIP fields ──
  "Machine No / Area of Improvement": { kannada: "ಯಂತ್ರ ಸಂ / ಸುಧಾರಣೆ ಪ್ರದೇಶ", tamil: "இயந்திர எண் / மேம்பாட்டு பகுதி", hindi: "मशीन नं / सुधार क्षेत्र", telugu: "మెషిన్ నం / మెరుగుదల ప్రాంతం" },
  "Suggestion Description": { kannada: "ಸಲಹೆ ವಿವರಣೆ", tamil: "பரிந்துரை விளக்கம்", hindi: "सुझाव विवरण", telugu: "సూచన వివరణ" },
  "Photos – Before": { kannada: "ಫೋಟೋಗಳು – ಮೊದಲು", tamil: "புகைப்படங்கள் – முன்", hindi: "फोटो – पहले", telugu: "ఫోటోలు – ముందు" },
  "Photos – After": { kannada: "ಫೋಟೋಗಳು – ನಂತರ", tamil: "புகைப்படங்கள் – பின்", hindi: "फोटो – बाद", telugu: "ఫోటోలు – తర్వాత" },

  // ── Cash The Flash fields ──
  "Suggestor Name": { kannada: "ಸಲಹೆಗಾರರ ಹೆಸರು", tamil: "பரிந்துரையாளர் பெயர்", hindi: "सुझावकर्ता का नाम", telugu: "సూచనకర్త పేరు" },
  "Share %": { kannada: "ಪಾಲು %", tamil: "பங்கு %", hindi: "हिस्सा %", telugu: "వాటా %" },

  // ── NewSuggestion page ──
  "Details": { kannada: "ವಿವರಗಳು", tamil: "விவரங்கள்", hindi: "विवरण", telugu: "వివరాలు" },

  // ── Copy Suggestion page ──
  "Enter Suggestion No": { kannada: "ಸಲಹೆ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ", tamil: "பரிந்துரை எண் உள்ளிடவும்", hindi: "सुझाव संख्या दर्ज करें", telugu: "సూచన సంఖ్య నమోదు చేయండి" },
  "Clone & Edit in Form": { kannada: "ನಕಲು ಮಾಡಿ ಮತ್ತು ಸಂಪಾದಿಸಿ", tamil: "நகலெடுத்து படிவத்தில் திருத்து", hindi: "क्लोन करें और फॉर्म में संपादित करें", telugu: "క్లోన్ చేసి ఫారమ్‌లో మార్చండి" },
  "Original Suggestion": { kannada: "ಮೂಲ ಸಲಹೆ", tamil: "அசல் பரிந்துரை", hindi: "मूल सुझाव", telugu: "అసలు సూచన" },

  // ── Table headers ──
  "Suggestion": { kannada: "ಸಲಹೆ", tamil: "பரிந்துரை", hindi: "सुझाव", telugu: "సూచన" },
  "Suggestion No": { kannada: "ಸಲಹೆ ಸಂಖ್ಯೆ", tamil: "பரிந்துரை எண்", hindi: "सुझाव संख्या", telugu: "సూచన సంఖ్య" },
  "Subject": { kannada: "ವಿಷಯ", tamil: "தலைப்பு", hindi: "विषय", telugu: "విషయం" },
  "Type": { kannada: "ಪ್ರಕಾರ", tamil: "வகை", hindi: "प्रकार", telugu: "రకం" },
  "Status": { kannada: "ಸ್ಥಿತಿ", tamil: "நிலை", hindi: "स्थिति", telugu: "స్థితి" },
  "Date": { kannada: "ದಿನಾಂಕ", tamil: "தேதி", hindi: "तिथि", telugu: "తేదీ" },
  "Actions": { kannada: "ಕ್ರಮಗಳು", tamil: "செயல்கள்", hindi: "कार्रवाई", telugu: "చర్యలు" },
  "Pending With": { kannada: "ಬಾಕಿ ಇರುವವರು", tamil: "நிலுவையில் உள்ளவர்", hindi: "लंबित", telugu: "పెండింగ్‌లో" },
  "Days": { kannada: "ದಿನಗಳು", tamil: "நாட்கள்", hindi: "दिन", telugu: "రోజులు" },
  "Employee": { kannada: "ಉದ್ಯೋಗಿ", tamil: "பணியாளர்", hindi: "कर्मचारी", telugu: "ఉద్యోగి" },

  // ── Tabs ──
  "All Pending": { kannada: "ಎಲ್ಲಾ ಬಾಕಿ", tamil: "அனைத்து நிலுவை", hindi: "सभी लंबित", telugu: "అన్ని పెండింగ్" },
  "Submitted": { kannada: "ಸಲ್ಲಿಸಲಾಗಿದೆ", tamil: "சமர்ப்பிக்கப்பட்டது", hindi: "जमा किया", telugu: "సమర్పించబడింది" },
  "All Submissions": { kannada: "ಎಲ್ಲಾ ಸಲ್ಲಿಕೆಗಳು", tamil: "அனைத்து சமர்ப்பிப்புகள்", hindi: "सभी प्रस्तुतियाँ", telugu: "అన్ని సమర్పణలు" },
  "Saved": { kannada: "ಉಳಿಸಲಾಗಿದೆ", tamil: "சேமிக்கப்பட்டது", hindi: "सहेजा गया", telugu: "సేవ్ చేయబడింది" },
  "Daily CIP": { kannada: "ದೈನಿಕ CIP", tamil: "தினசரி CIP", hindi: "दैनिक CIP", telugu: "రోజువారీ CIP" },
  "SFC Evaluation": { kannada: "SFC ಮೌಲ್ಯಮಾಪನ", tamil: "SFC மதிப்பீடு", hindi: "SFC मूल्यांकन", telugu: "SFC మూల్యాంకనం" },
  "SFC Approval": { kannada: "SFC ಅನುಮೋದನೆ", tamil: "SFC ஒப்புதல்", hindi: "SFC अनुमोदन", telugu: "SFC ఆమోదం" },
  "CTF Opinion": { kannada: "CTF ಅಭಿಪ್ರಾಯ", tamil: "CTF கருத்து", hindi: "CTF राय", telugu: "CTF అభిప్రాయం" },
  "CTF Implementation": { kannada: "CTF ಅನುಷ್ಠಾನ", tamil: "CTF செயல்படுத்தல்", hindi: "CTF कार्यान्वयन", telugu: "CTF అమలు" },

  // ── Employee Home stats ──
  "Total Suggestions": { kannada: "ಒಟ್ಟು ಸಲಹೆಗಳು", tamil: "மொத்த பரிந்துரைகள்", hindi: "कुल सुझाव", telugu: "మొత్తం సూచనలు" },
  "Pending": { kannada: "ಬಾಕಿ", tamil: "நிலுவை", hindi: "लंबित", telugu: "పెండింగ్" },
  "Approved": { kannada: "ಅನುಮೋದಿಸಲಾಗಿದೆ", tamil: "அங்கீகரிக்கப்பட்டது", hindi: "अनुमोदित", telugu: "ఆమోదించబడింది" },
  "Awards Earned": { kannada: "ಗಳಿಸಿದ ಪ್ರಶಸ್ತಿಗಳು", tamil: "பெற்ற விருதுகள்", hindi: "अर्जित पुरस्कार", telugu: "సంపాదించిన అవార్డులు" },
  "Recent Suggestions": { kannada: "ಇತ್ತೀಚಿನ ಸಲಹೆಗಳು", tamil: "சமீபத்திய பரிந்துரைகள்", hindi: "हालिया सुझाव", telugu: "ఇటీవలి సూచనలు" },

  // ── Awards table ──
  "Award Category": { kannada: "ಪ್ರಶಸ್ತಿ ವರ್ಗ", tamil: "விருது வகை", hindi: "पुरस्कार श्रेणी", telugu: "అవార్డు వర్గం" },
  "Amount": { kannada: "ಮೊತ್ತ", tamil: "தொகை", hindi: "राशि", telugu: "మొత్తం" },
  "Award Date": { kannada: "ಪ್ರಶಸ್ತಿ ದಿನಾಂಕ", tamil: "விருது தேதி", hindi: "पुरस्कार तिथि", telugu: "అవార్డు తేదీ" },
  "Letter": { kannada: "ಪತ್ರ", tamil: "கடிதம்", hindi: "पत्र", telugu: "లేఖ" },

  // ── Pending Evaluation ──
  "Filter by type": { kannada: "ಪ್ರಕಾರದ ಮೂಲಕ ಫಿಲ್ಟರ್", tamil: "வகையால் வடிகட்டு", hindi: "प्रकार से फ़िल्टर", telugu: "రకం ద్వారా ఫిల్టర్" },
  "All Types": { kannada: "ಎಲ್ಲಾ ಪ್ರಕಾರಗಳು", tamil: "அனைத்து வகைகள்", hindi: "सभी प्रकार", telugu: "అన్ని రకాలు" },

  // ── Admin: Assign Authority ──
  "Plant Code": { kannada: "ಘಟಕ ಕೋಡ್", tamil: "ஆலை குறியீடு", hindi: "प्लांट कोड", telugu: "ప్లాంట్ కోడ్" },
  "Employee No": { kannada: "ಉದ್ಯೋಗಿ ಸಂಖ್ಯೆ", tamil: "பணியாளர் எண்", hindi: "कर्मचारी संख्या", telugu: "ఉద్యోగి సంఖ్య" },
  "Name": { kannada: "ಹೆಸರು", tamil: "பெயர்", hindi: "नाम", telugu: "పేరు" },
  "Mail ID": { kannada: "ಮೇಲ್ ಐಡಿ", tamil: "மின்னஞ்சல்", hindi: "मेल आईडी", telugu: "మెయిల్ ఐడీ" },
  "Department": { kannada: "ಇಲಾಖೆ", tamil: "துறை", hindi: "विभाग", telugu: "విభాగం" },
  "NTID": { kannada: "NTID", tamil: "NTID", hindi: "NTID", telugu: "NTID" },
  "Authority Role": { kannada: "ಅಧಿಕಾರ ಪಾತ್ರ", tamil: "அதிகார பாத்திரம்", hindi: "प्राधिकार भूमिका", telugu: "అధికార పాత్ర" },
  "Add Authority": { kannada: "ಅಧಿಕಾರ ಸೇರಿಸಿ", tamil: "அதிகாரம் சேர்", hindi: "प्राधिकार जोड़ें", telugu: "అధికారం జోడించు" },
  "Plant": { kannada: "ಘಟಕ", tamil: "ஆலை", hindi: "प्लांट", telugu: "ప్లాంట్" },
  "Emp No": { kannada: "ಉದ್ಯೋಗಿ ಸಂ", tamil: "பணியாளர் எண்", hindi: "कर्मचारी सं", telugu: "ఉద్యోగి సం" },
  "Dept": { kannada: "ಇಲಾಖೆ", tamil: "துறை", hindi: "विभाग", telugu: "విభాగం" },
  "Role": { kannada: "ಪಾತ್ರ", tamil: "பாத்திரம்", hindi: "भूमिका", telugu: "పాత్ర" },
  "Action": { kannada: "ಕ್ರಮ", tamil: "செயல்", hindi: "कार्रवाई", telugu: "చర్య" },

  // ── Admin: General Enquiry ──
  "From Date": { kannada: "ಇಂದಿನಿಂದ", tamil: "தொடக்க தேதி", hindi: "तारीख से", telugu: "తేదీ నుండి" },
  "To Date": { kannada: "ಇಂದಿನವರೆಗೆ", tamil: "இறுதி தேதி", hindi: "तारीख तक", telugu: "తేదీ వరకు" },
  "Suggestion Type": { kannada: "ಸಲಹೆ ಪ್ರಕಾರ", tamil: "பரிந்துரை வகை", hindi: "सुझाव प्रकार", telugu: "సూచన రకం" },

  // ── Additional ──
  "Year": { kannada: "ವರ್ಷ", tamil: "ஆண்டு", hindi: "वर्ष", telugu: "సంవత్సరం" },
  "Month": { kannada: "ತಿಂಗಳು", tamil: "மாதம்", hindi: "महीना", telugu: "నెల" },
  "No awards yet": { kannada: "ಇನ್ನೂ ಪ್ರಶಸ್ತಿಗಳಿಲ್ಲ", tamil: "இன்னும் விருதுகள் இல்லை", hindi: "अभी तक कोई पुरस्कार नहीं", telugu: "ఇంకా అవార్డులు లేవు" },
  "Remark": { kannada: "ಟಿಪ್ಪಣಿ", tamil: "குறிப்பு", hindi: "टिप्पणी", telugu: "వ్యాఖ్య" },
  "Description": { kannada: "ವಿವರಣೆ", tamil: "விளக்கம்", hindi: "विवरण", telugu: "వివరణ" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  tAll: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const VALID_LANGS: Language[] = ["kannada", "tamil", "hindi", "telugu"];

const PLANT_DEFAULT_LANG: Record<string, Language> = {
  bidp: "kannada",
  jap:  "hindi",
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const { plant } = usePlant();

  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem("preferredLanguage") as Language;
      if (stored && VALID_LANGS.includes(stored)) return stored;
    } catch { /* ignore */ }
    return plant ? (PLANT_DEFAULT_LANG[plant] ?? "kannada") : "kannada";
  });

  // Auto-switch language when plant changes (e.g. JaP → Hindi, BidP → Kannada)
  useEffect(() => {
    if (!plant) return;
    const allowed = plant === "jap" ? ["hindi"] : VALID_LANGS;
    if (!allowed.includes(language)) {
      const def = PLANT_DEFAULT_LANG[plant] ?? "kannada";
      setLanguageState(def);
      try { localStorage.setItem("preferredLanguage", def); } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plant]);

  const setLanguage = (lang: Language) => {
    try { localStorage.setItem("preferredLanguage", lang); } catch { /* ignore */ }
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  const tAll = (key: string): string => {
    const entry = translations[key];
    if (!entry) return key;
    return [entry.kannada, entry.tamil, entry.hindi, entry.telugu].filter(Boolean).join(" / ");
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tAll }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};

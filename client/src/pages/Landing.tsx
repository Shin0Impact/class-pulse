import Navbar from '../components/landing/Navbar/Navbar';
import Hero from '../components/landing/Hero/Hero';
import LivePulse from '../components/landing/LivePulse/LivePulse';
import Features from '../components/landing/Features/Features';
import { usePreferences } from '../context/PreferencesContext';
import './Landing.css';

export default function Landing(){const{language}=usePreferences();const ar=language==='ar';return <main className="landing-page"><Navbar/><Hero/><LivePulse/><Features/><section className="landing-final" id="how" aria-labelledby="final-title"><p>{ar?'جاهز تشوف نبض صفك؟':'Ready to see your class pulse?'}</p><h2 id="final-title">{ar?'خلّي الفهم يظهر قبل فوات الأوان.':'Make understanding visible before it is too late.'}</h2><a href="/teacher">{ar?'ابدأ أول حصة':'Start your first class'} <span aria-hidden="true">←</span></a></section><footer className="landing-footer"><strong>{ar?'نبض الصف':'Class Pulse'}</strong><span>{ar?'تعليم يستمع لكل طالب.':'Learning that listens to every student.'}</span></footer></main>}

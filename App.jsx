import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './App.css';
import './i18n';

// Function to handle iframe load and error states
const handleIframeLoad = (iframe, fallbackElement) => {
  // Show iframe initially
  iframe.style.display = 'block';
  if (fallbackElement) {
    fallbackElement.style.display = 'none';
  }
};

const handleIframeError = (iframe, fallbackElement) => {
  // Hide iframe and show fallback
  iframe.style.display = 'none';
  if (fallbackElement) {
    fallbackElement.style.display = 'block';
  }
};

// Función para convertir hora en formato 'HH:MM' a minutos desde medianoche
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Función para convertir minutos a formato 'HH:MM'
const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Función para calcular el tiempo restante entre dos horas
const calculateTimeRemaining = (currentTime, targetTime) => {
  let diff = targetTime - currentTime;
  
  // Si la diferencia es negativa, significa que el objetivo es mañana
  if (diff < 0) {
    diff += 24 * 60; // Añadir un día completo en minutos
  }
  
  const hours = Math.floor(diff / 60);
  const minutes = Math.floor(diff % 60);
  const seconds = Math.floor((diff % 1) * 60);
  
  return { hours, minutes, seconds };
};

function App() {
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState('es');
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [nextPrayer, setNextPrayer] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [loading, setLoading] = useState(true);
  const [ibanCopied, setIbanCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [monthlyPrayerTimes, setMonthlyPrayerTimes] = useState(null);
  const [loadingMonthly, setLoadingMonthly] = useState(true);
  const [showMonthlyCalendar, setShowMonthlyCalendar] = useState(false);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setCurrentLanguage(lng);
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
  };

  useEffect(() => {
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  // Efecto para obtener los horarios de oración
  useEffect(() => {
    const fetchPrayerTimes = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          "https://api.aladhan.com/v1/timingsByCity?city=Playa%20Blanca&country=Spain&method=3&timezone=Atlantic/Canary"
        );
        const data = await response.json();
        
        if (data && data.data && data.data.timings) {
          const timings = data.data.timings;
          setPrayerTimes({
            Fajr: timings.Fajr,
            Sunrise: timings.Sunrise,
            Dhuhr: timings.Dhuhr,
            Asr: timings.Asr,
            Maghrib: timings.Maghrib,
            Isha: timings.Isha
          });
        }
      } catch (error) {
        console.error("Error fetching prayer times:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrayerTimes();
  }, []);

  // Función para obtener horarios de oración mensuales
  useEffect(() => {
    const fetchMonthlyPrayerTimes = async () => {
      try {
        setLoadingMonthly(true);
        // Obtener el mes y año actual automáticamente
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1; // getMonth() devuelve 0-11, por eso +1
        
        const response = await fetch(
          `https://api.aladhan.com/v1/calendar?latitude=28.8627&longitude=-13.8372&method=3&month=${month}&year=${year}&timezone=Atlantic/Canary`
        );
        const data = await response.json();
        
        if (data && data.data) {
          setMonthlyPrayerTimes(data.data);
        }
      } catch (error) {
        console.error("Error fetching monthly prayer times:", error);
      } finally {
        setLoadingMonthly(false);
      }
    };

    fetchMonthlyPrayerTimes();
  }, []);

  // Efecto para determinar la próxima oración y actualizar el contador
  useEffect(() => {
    if (!prayerTimes) return;

    const updateNextPrayer = () => {
      // Obtener la hora actual en la zona horaria de Canarias
      const now = new Date();
      const canaryTime = new Date(now.toLocaleString("en-US", {timeZone: "Atlantic/Canary"}));
      const currentHour = canaryTime.getHours();
      const currentMinute = canaryTime.getMinutes();
      const currentSecond = canaryTime.getSeconds();
      
      // Convertir la hora actual a minutos desde medianoche
      const currentTimeInMinutes = currentHour * 60 + currentMinute + currentSecond / 60;
      
      // Convertir los horarios de oración a minutos desde medianoche
      const prayerTimesInMinutes = {};
      for (const [prayer, time] of Object.entries(prayerTimes)) {
        prayerTimesInMinutes[prayer] = timeToMinutes(time);
      }
      
      // Encontrar la próxima oración
      let nextPrayerName = null;
      let nextPrayerTime = Infinity;
      
      for (const [prayer, timeInMinutes] of Object.entries(prayerTimesInMinutes)) {
        if (timeInMinutes > currentTimeInMinutes && timeInMinutes < nextPrayerTime) {
          nextPrayerName = prayer;
          nextPrayerTime = timeInMinutes;
        }
      }
      
      // Si no hay próxima oración hoy, la próxima es Fajr mañana
      if (!nextPrayerName) {
        nextPrayerName = 'Fajr';
        nextPrayerTime = prayerTimesInMinutes['Fajr'] + 24 * 60; // Añadir un día
      }
      
      setNextPrayer({
        name: nextPrayerName,
        time: prayerTimes[nextPrayerName]
      });
      
      // Calcular tiempo restante
      const remaining = calculateTimeRemaining(
        currentTimeInMinutes,
        nextPrayerTime
      );
      
      setTimeRemaining({
        hours: remaining.hours,
        minutes: remaining.minutes,
        seconds: Math.floor((currentSecond / 60) * 60)
      });
    };
    
    // Actualizar inmediatamente
    updateNextPrayer();
    
    // Actualizar cada segundo
    const intervalId = setInterval(() => {
      updateNextPrayer();
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [prayerTimes]);

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false); // Cerrar menú móvil al navegar
    }
  };

  const copyIBAN = () => {
    navigator.clipboard.writeText('ES54 2100 5420 4213 0055 8142');
    setIbanCopied(true);
    setTimeout(() => setIbanCopied(false), 2000);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">MEZQUITA ALHUDA</div>
        
        {/* Desktop Navigation */}
        <nav className="nav desktop-nav">
          <ul>
            <li onClick={() => scrollToSection('home')}>{t('nav.home')}</li>
            <li onClick={() => scrollToSection('about')}>{t('nav.about')}</li>
            <li onClick={() => scrollToSection('objectives')}>{t('donations.objectives.title')}</li>
            <li onClick={() => scrollToSection('prayer-times')}>{t('prayerTimes.title')}</li>
            <li onClick={() => scrollToSection('monthly-calendar')}>{t('prayerTimes.monthly_calendar')}</li>
            <li onClick={() => scrollToSection('live-stream')}>{t('nav.live_stream')}</li>
            <li onClick={() => scrollToSection('donations')}>{t('nav.donate')}</li>
            <li onClick={() => scrollToSection('contact')}>{t('nav.contact')}</li>
          </ul>
        </nav>
        
        {/* Desktop Language Selector */}
        <div className="language-selector desktop-language">
          <button
            className={currentLanguage === 'en' ? 'active' : ''}
            onClick={() => changeLanguage('en')}
          >
            EN
          </button>
          <button
            className={currentLanguage === 'es' ? 'active' : ''}
            onClick={() => changeLanguage('es')}
          >
            ES
          </button>
          <button
            className={currentLanguage === 'ar' ? 'active' : ''}
            onClick={() => changeLanguage('ar')}
          >
            AR
          </button>
        </div>
        
        {/* Mobile Hamburger Button */}
        <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
          <span className={`hamburger ${mobileMenuOpen ? 'active' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
        
        {/* Mobile Navigation Menu */}
        <div className={`mobile-nav ${mobileMenuOpen ? 'active' : ''}`}>
          <nav className="mobile-nav-content">
            <ul>
              <li onClick={() => { scrollToSection('home'); setMobileMenuOpen(false); }}>{t('nav.home')}</li>
              <li onClick={() => { scrollToSection('about'); setMobileMenuOpen(false); }}>{t('nav.about')}</li>
              <li onClick={() => { scrollToSection('objectives'); setMobileMenuOpen(false); }}>{t('donations.objectives.title')}</li>
              <li onClick={() => { scrollToSection('prayer-times'); setMobileMenuOpen(false); }}>{t('prayerTimes.title')}</li>
              <li onClick={() => { scrollToSection('monthly-calendar'); setMobileMenuOpen(false); }}>{t('prayerTimes.monthly_calendar')}</li>
              <li onClick={() => { scrollToSection('live-stream'); setMobileMenuOpen(false); }}>{t('nav.live_stream')}</li>
              <li onClick={() => { scrollToSection('donations'); setMobileMenuOpen(false); }}>{t('nav.donate')}</li>
              <li onClick={() => { scrollToSection('contact'); setMobileMenuOpen(false); }}>{t('nav.contact')}</li>
            </ul>
            
            {/* Mobile Language Selector */}
            <div className="mobile-language-selector">
              <button
                className={currentLanguage === 'en' ? 'active' : ''}
                onClick={() => changeLanguage('en')}
              >
                EN
              </button>
              <button
                className={currentLanguage === 'es' ? 'active' : ''}
                onClick={() => changeLanguage('es')}
              >
                ES
              </button>
              <button
                className={currentLanguage === 'ar' ? 'active' : ''}
                onClick={() => changeLanguage('ar')}
              >
                AR
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <section id="home" className="hero">
          <h2>{t('hero.welcome')}</h2>
          <h1>{t('hero.mosque_name')}</h1>
          <p>{t('hero.subtitle')}</p>
          <button className="cta-button" onClick={() => scrollToSection('donations')}>
            {t('nav.donate')}
          </button>
        </section>

        <section id="about" className="about">
          <div className="container">
            <h2>{t('about.title')}</h2>
            <p>{t('about.description')}</p>
          </div>
        </section>

        <section id="objectives" className="donations">
          <div className="container">
            <h2>{t('donations.objectives.title')}</h2>
            <h3 className="centered-subtitle">{t('donations.subtitle')}</h3>
            <p className="centered-description">{t('donations.donation_info')}</p>
            
            <div className="objectives">
              <h3>{t('donations.objectives.title')}</h3>
              <ul>
                <li>{t('donations.objectives.education_islamic')}</li>
                <li>{t('donations.objectives.community_bonds')}</li>
                <li>{t('donations.objectives.all_groups')}</li>
                <li>{t('donations.objectives.facilities')}</li>
                <li>{t('donations.objectives.dialogue')}</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="prayer-times" className="prayer-times">
          <div className="container">
            <h2>{t('prayerTimes.title')}</h2>
            <p className="subtitle">{t('prayerTimes.subtitle')}</p>
            
            {loading ? (
              <div className="loading">Cargando horarios...</div>
            ) : prayerTimes ? (
              <div className="prayer-times-content">
                <div className="prayer-times-grid">
                  <div className="prayer-time">
                    <div className="prayer-name">{t('prayerTimes.fajr')}</div>
                    <div className="prayer-hour">{prayerTimes.Fajr}</div>
                  </div>
                  <div className="prayer-time">
                    <div className="prayer-name">{t('prayerTimes.sunrise')}</div>
                    <div className="prayer-hour">{prayerTimes.Sunrise}</div>
                  </div>
                  <div className="prayer-time">
                    <div className="prayer-name">{t('prayerTimes.dhuhr')}</div>
                    <div className="prayer-hour">{prayerTimes.Dhuhr}</div>
                  </div>
                  <div className="prayer-time">
                    <div className="prayer-name">{t('prayerTimes.asr')}</div>
                    <div className="prayer-hour">{prayerTimes.Asr}</div>
                  </div>
                  <div className="prayer-time">
                    <div className="prayer-name">{t('prayerTimes.maghrib')}</div>
                    <div className="prayer-hour">{prayerTimes.Maghrib}</div>
                  </div>
                  <div className="prayer-time">
                    <div className="prayer-name">{t('prayerTimes.isha')}</div>
                    <div className="prayer-hour">{prayerTimes.Isha}</div>
                  </div>
                </div>
                
                {nextPrayer && (
                  <div className="next-prayer">
                    <h3>{t('prayerTimes.next_prayer')}: {t(`prayerTimes.${nextPrayer.name.toLowerCase()}`)}</h3>
                    <div className="next-prayer-time">{nextPrayer.time}</div>
                    <div className="countdown">
                      <h4>{t('prayerTimes.time_remaining')}:</h4>
                      <div className="countdown-timer">
                        <div className="time-unit">
                          <span className="time-value">{timeRemaining.hours}</span>
                          <span className="time-label">{t('prayerTimes.hours')}</span>
                        </div>
                        <div className="time-separator">:</div>
                        <div className="time-unit">
                          <span className="time-value">{timeRemaining.minutes}</span>
                          <span className="time-label">{t('prayerTimes.minutes')}</span>
                        </div>
                        <div className="time-separator">:</div>
                        <div className="time-unit">
                          <span className="time-value">{timeRemaining.seconds}</span>
                          <span className="time-label">{t('prayerTimes.seconds')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="error">Error al cargar los horarios de oración</div>
            )}
          </div>
        </section>

        {/* Monthly Prayer Calendar */}
        <section id="monthly-calendar" className="monthly-calendar">
          <div className="container">
            <h2>{t('prayerTimes.monthly_calendar')}</h2>
            <p className="subtitle">{t('prayerTimes.prayer_times_month')} - {(() => {
              const currentDate = new Date();
              const locale = currentLanguage === 'ar' ? 'ar-SA' : currentLanguage === 'en' ? 'en-US' : 'es-ES';
              const monthYear = currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
              return monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
            })()}</p>
            <div className="mosque-info">
              <h3>{t('prayerTimes.mosque_name')}</h3>
              <p>{t('prayerTimes.location_full')}</p>
            </div>
            
            {loadingMonthly ? (
              <div className="loading">Cargando calendario mensual...</div>
            ) : monthlyPrayerTimes.length > 0 ? (
              <div className="calendar-container">
                <div className="calendar-header">
                  <div className="header-cell">{t('prayerTimes.day')}</div>
                  <div className="header-cell">{t('prayerTimes.date')}</div>
                  <div className="header-cell">{t('prayerTimes.hijri_date')}</div>
                  <div className="header-cell">{t('prayerTimes.fajr')}</div>
                  <div className="header-cell">{t('prayerTimes.sunrise')}</div>
                  <div className="header-cell">{t('prayerTimes.dhuhr')}</div>
                  <div className="header-cell">{t('prayerTimes.asr')}</div>
                  <div className="header-cell">{t('prayerTimes.maghrib')}</div>
                  <div className="header-cell">{t('prayerTimes.isha')}</div>
                </div>
                
                <div className="calendar-body">
                  {monthlyPrayerTimes.map((day, index) => {
                    // Crear fecha usando el formato DD-MM-YYYY de la API
                    const [dayNum, monthNum, yearNum] = day.date.gregorian.date.split('-');
                    const date = new Date(yearNum, monthNum - 1, dayNum);
                    
                    // Obtener el nombre del día en el idioma actual
                    const dayNames = {
                      0: 'sunday',
                      1: 'monday', 
                      2: 'tuesday',
                      3: 'wednesday',
                      4: 'thursday',
                      5: 'friday',
                      6: 'saturday'
                    };
                    
                    const dayName = t(`prayerTimes.days.${dayNames[date.getDay()]}`);
                    
                    return (
                      <div key={index} className="calendar-row">
                        <div className="calendar-cell day-name">{dayName}</div>
                        <div className="calendar-cell">{day.date.gregorian.date}</div>
                        <div className="calendar-cell">{day.date.hijri.date}</div>
                        <div className="calendar-cell">{day.timings.Fajr.split(' ')[0]}</div>
                        <div className="calendar-cell">{day.timings.Sunrise.split(' ')[0]}</div>
                        <div className="calendar-cell">{day.timings.Dhuhr.split(' ')[0]}</div>
                        <div className="calendar-cell">{day.timings.Asr.split(' ')[0]}</div>
                        <div className="calendar-cell">{day.timings.Maghrib.split(' ')[0]}</div>
                        <div className="calendar-cell">{day.timings.Isha.split(' ')[0]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="error">Error al cargar el calendario mensual</div>
            )}
          </div>
        </section>

        <section id="live-stream" className="live-stream">
          <div className="container">
            <h2>{t('live_stream.title')}</h2>
            <p className="subtitle">{t('live_stream.subtitle')}</p>
            <p className="description">{t('live_stream.description')}</p>
            
            <div className="stream-container">
              <div className="stream-info">
                <h3>{t('live_stream.schedule')}</h3>
                <p className="schedule-time">{t('live_stream.friday_time')}</p>
              </div>
              
              <div className="youtube-embed">
                <iframe
                  width="560"
                  height="315"
                  src="https://www.youtube.com/embed/live_stream?channel=UCuDyCSIcj3IKB57kWSBkaTQ"
                  title="Mezquita Alhuda Live Stream"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
              
              <div className="stream-buttons">
                <a 
                  href="https://studio.youtube.com/channel/UCuDyCSIcj3IKB57kWSBkaTQ/livestreaming" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="stream-button live-button"
                >
                  {t('live_stream.watch_live')}
                </a>
                <a 
                  href="https://www.youtube.com/channel/UCuDyCSIcj3IKB57kWSBkaTQ" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="stream-button channel-button"
                >
                  {t('live_stream.visit_channel')}
                </a>
              </div>
              
              <div className="stream-note">
                <p>{t('live_stream.note')}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="donations" className="donations">
          <div className="container">
            <h2>{t('donations.title')}</h2>
            <h3 className="centered-subtitle">{t('donations.subtitle')}</h3>
            <p className="centered-description">{t('donations.donation_info')}</p>
            
            <div className="quran-quotes">
              <h3>{t('donations.quran_quotes.title')}</h3>
              <div className="quote">{t('donations.quran_quotes.quote1')}</div>
              <div className="quote">{t('donations.quran_quotes.quote2')}</div>
              <div className="quote">{t('donations.quran_quotes.quote3')}</div>
            </div>
            
            <div className="hadith-quote">
              <p>{t('donations.hadith')}</p>
            </div>
            
            <div className="objectives">
              <h3>{t('donations.objectives.title')}</h3>
              <ul>
                <li>{t('donations.objectives.education_islamic')}</li>
                <li>{t('donations.objectives.community_bonds')}</li>
                <li>{t('donations.objectives.all_groups')}</li>
                <li>{t('donations.objectives.facilities')}</li>
                <li>{t('donations.objectives.dialogue')}</li>
              </ul>
            </div>
            
            <div className="donation-info">
              <h3>{t('donations.iban_label')}</h3>
              <p>{t('donations.bank_transfer')}</p>
              <div className="iban-container">
                <div className="iban">{t('donations.iban_number')}</div>
                <button className="copy-button" onClick={copyIBAN}>
                  {ibanCopied ? t('donations.iban_copied') : t('donations.copy_iban')}
                </button>
              </div>
            </div>
            
            <p className="location">{t('donations.location')}</p>
            <p className="thank-you">{t('donations.thank_you')}</p>
          </div>
        </section>

        <section id="contact" className="contact">
          <div className="container">
            <h2>{t('contact.title')}</h2>
            <div className="contact-info">
              <p><strong>📍 {t('contact.address')}</strong></p>
              <p><strong>📞 <span className="phone">{t('contact.phone')}</span></strong></p>
              <p><strong>✉️ <span className="email">{t('contact.email')}</span></strong></p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>MEZQUITA ALHUDA</h3>
              <ul>
                <li onClick={() => scrollToSection('home')}>{t('nav.home')}</li>
                <li onClick={() => scrollToSection('about')}>{t('nav.about')}</li>
                <li onClick={() => scrollToSection('objectives')}>{t('donations.objectives.title')}</li>
                <li onClick={() => scrollToSection('prayer-times')}>{t('prayerTimes.title')}</li>
                <li onClick={() => scrollToSection('live-stream')}>{t('nav.live_stream')}</li>
                <li onClick={() => scrollToSection('donations')}>{t('nav.donate')}</li>
                <li onClick={() => scrollToSection('contact')}>{t('nav.contact')}</li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>{t('contact.title')}</h3>
              <p>📍 {t('contact.address')}</p>
              <p>📞 <span className="phone">{t('contact.phone')}</span></p>
              <p>✉️ <span className="email">{t('contact.email')}</span></p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} MEZQUITA ALHUDA. {t('donations.thank_you')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
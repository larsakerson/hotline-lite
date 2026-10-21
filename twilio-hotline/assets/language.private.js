// lang2 -> {locale, display name, optional text-to-speech voice}.
//
// Without an explicit `voice`, Twilio uses the account-level default for the
// locale (configurable in the console at
// https://console.twilio.com/us1/develop/voice/settings/text-to-speech), which
// for most languages is a low-quality, choppy "standard" voice. Setting a voice
// here gives every deployment a good caller experience without per-account
// setup. Languages omitted here fall back to that locale default.
//
// Voices are Twilio voice identifiers (https://www.twilio.com/docs/voice/twiml/say/text-speech).
// These are Amazon Polly "Neural" voices — a good quality/cost balance; swap in
// Polly "-Generative" or "Google.<locale>-Chirp3-HD-*" voices for the most
// natural output. Languages with no voice in their own language (ht, ku, ti,
// sw, uk, rw, ru, am, fa, vi) are left to the locale default rather than being
// read aloud by a voice from an unrelated language.
const langMap = {
  en: { locale: 'en-US', name: 'English', voice: 'Polly.Joanna-Neural' },
  es: { locale: 'es-MX', name: 'Spanish', voice: 'Polly.Mia-Neural' },
  fa_af: { locale: 'fa-AF', name: 'Dari', voice: 'Polly.Hala-Neural' }, // Distinct from Farsi (fa-IR)
  fa_ir: { locale: 'fa-IR', name: 'Farsi', voice: 'Polly.Hala-Neural' }, // Distinct from Dari (fa-AF)
  fr: { locale: 'fr-FR', name: 'French', voice: 'Polly.Lea-Neural' },
  // currently unsupported - pt: { locale: 'pt-BR', name: 'Portuguese', voice: 'Polly.Camila-Neural' },
  // currently unsupported - ht: { locale: 'ht-HT', name: 'Haitian Creole' },
  // currently unsupported - zh: { locale: 'zh-CN', name: 'Chinese', voice: 'Polly.Zhiyu-Neural' },  // cmn-CN (Mandarin)
  // currently unsupported - ar: { locale: 'ar-IQ', name: 'Arabic', voice: 'Polly.Hala-Neural' },    // ar-AE (Gulf Arabic; nearest neural voice to ar-IQ)
  // currently unsupported - ku: { locale: 'ku-IQ', name: 'Kurdish' },
  // currently unsupported - ti: { locale: 'ti-ET', name: 'Tigrinya' },
  // currently unsupported - sw: { locale: 'sw-KE', name: 'Swahili' },
  // currently unsupported - uk: { locale: 'uk-UA', name: 'Ukrainian' },
  // currently unsupported - rw: { locale: 'rw-RW', name: 'Kinyarwanda' },
  // currently unsupported - ru: { locale: 'ru-RU', name: 'Russian' },
  // currently unsupported - am: { locale: 'am-ET', name: 'Amharic' },
  // currently unsupported - vi: { locale: 'vi-VN', name: 'Vietnamese' },
};

// Build the attributes object for a TwiML <Say>: always sets the language
// locale, and adds the configured voice when one exists for the language.
const sayAttrs = function (lang2) {
  const attrs = { language: langMap[lang2].locale };
  if (langMap[lang2].voice) attrs.voice = langMap[lang2].voice;
  return attrs;
};

const formatE164 = function (phone) {
  // E.164 to (XXX) XXX-XXXX
  let formattedPhone = phone;
  if (phone.length == 12) {
    formattedPhone = "(" + phone.slice(2, 5) + ") " + phone.slice(5, 8) + "-" + phone.slice(8, 12);
  } else if (phone.length == 11) {
    formattedPhone = "(" + phone.slice(1, 4) + ") " + phone.slice(4, 7) + "-" + phone.slice(7, 11);
  }
  return formattedPhone;
}

// This is a TwiML helper function that can be used to say a phone number in a more human-friendly way.
// The twiml object must have a say() sub-verb. Examples include twiml itself, and twiml.gather.
const sayLangMap = function (twiml, lang2, message, phone = "") {
  const messageParts = message.split("{phone number}");
  for (let i = 0; i < messageParts.length; i++) {
    const say = twiml.say(sayAttrs(lang2), messageParts[i]);
    if (i < messageParts.length - 1) {
      const formattedPhone = formatE164(phone);
      say.sayAs({ "interpret-as": "telephone" }, formattedPhone);
    }
  }
}

const messagesMap = {
  en: {
    name: "the community hotline",
    caller: {
      welcome: {
        hello: "Thank you for calling {hotline name}.",
        menu: "Press {key} for English.",
        goodbye: "Goodbye.",
      },
      wait: {
        connecting: "Someone will be with you shortly.",
        leaveAMessage: "Please remain on the line, or press any key to leave a message.",
      },
      record: {
        prompt: "Please leave a message after the tone.",
      }
    },
    operator: {
      precall: {
        intro: "This is a call from {hotline name}. Press any key to accept the call.",
        introNamed: "This is a call from {caller name}, through {hotline name}. Press any key to accept the call.",
        noResponse: "You didn't respond, so we're moving on to another operator. This call was from {phone number}.",
        reservationStatus: {
          rescinded: "Another operator answered this call.",
          canceled: "The caller hung up.",
          default: "Someone else answered or the caller hung up.",
        }
      },
      postcall: {
        options: "Call finished. Press 1 to repeat the caller's number. Press 2 to add the caller to the blocklist. Press 3 to call the caller back.",
        callerNumber: "This call was from {phone number}.",
        blocking: "Blocking calls from {phone number}.",
        callingBack: "Calling {phone number}.",
      }
    }
  },
  es: {
    name: "la línea comunitaria",
    caller: {
      welcome: {
        hello: "Gracias por llamar a {hotline name}.",
        menu: "Presione {key} para español.",
        goodbye: "Cuídese.",
      },
      wait: {
        connecting: "Alguien estará con usted en breve.",
        leaveAMessage: "Por favor, permanezca en la línea o presione cualquier tecla para dejar un mensaje.",
      },
      record: {
        prompt: "Por favor, deje un mensaje después del tono.",
      }
    },
    operator: {
      precall: {
        intro: "Esta es una llamada de {caller name}. Presione cualquier tecla para aceptar la llamada.",
        introNamed: "Esta es una llamada de {caller name}, a través de {hotline name}. Presione cualquier tecla para aceptar la llamada.",
        noResponse: "No respondió, así que pasamos a otro operador. Esta llamada era de {phone number}.",
        reservationStatus: {
          rescinded: "Otre operador respondió a esta llamada.",
          canceled: "La persona en espera terminó la llamada.",
          default: "La llamada se finalizó.",
        }
      },
      postcall: {
        options: "Llamada finalizada. Presione 1 para escuchar el número de nuevo. Presione 2 para bloquearlo. Presione 3 para marcarlo de nuevo.",
        callerNumber: "Esta llamada era de {phone number}.",
        blocking: "Se bloquearon llamadas de {phone number}.",
        callingBack: "Marcando {phone number}.",
      }
    }
  },
  fa_af: {
    name: "خط تماس جامعه",
    caller: {
      welcome: {
        hello: "از تماس با {hotline name} سپاسگزاریم.",
        menu: "برای دری روی کلید{key} را فشار دهید.",
        goodbye: "خداحافظ.",
      },
      wait: {
        connecting: "به زودی با شما تماس گرفته خواهد شد.",
        leaveAMessage: "لطفاً در خط بمانید یا هر کلیدی را فشار دهید تا پیامی بگذارید.",
      },
      record: {
        prompt: "لطفاً پس از صدای زنگ پیامی بگذارید.",
      }
    },
    operator: {
      precall: {
        intro: "این تماس از {hotline name} است. برای پذیرش تماس، هر کلیدی را فشار دهید.",
        introNamed: "این تماس از {caller name} است, از طریق {hotline name}. برای پذیرش تماس, هر کلیدی را فشار دهید.",
        noResponse: "شما پاسخ ندادید, بنابراین ما به اپراتور دیگری میرویم. این تماس از {phone number} بود.",
        reservationStatus: {
          rescinded: "اپراتور دیگری به این تماس پاسخ داد.",
          canceled: "تماس را قطع کرد.",
          default: "کسی دیگر پاسخ داد یا تماس قطع شد.",
        }
      },
      postcall: {
        options: "تماس تمام شد. کلید 1 را فشار دهید تا شماره مکالمه را دوباره بشنوید. کلید 2 را فشار دهید تا مکالمه را به لیست بلاک اضافه کنید. کلید 3 را فشار دهید تا مکالمه را دوباره برقرار کنید.",
        callerNumber: "این تماس از {phone number} بود.",
        blocking: "مکالمات از {phone number} را مسدود می‌کنم.",
        callingBack: "در حال تماس با {phone number}.",
      }
    }
  },
  fa_ir: {
    name: "خط تماس جامعه",
    caller: {
      welcome: {
        hello: "از تماس با {hotline name} سپاسگزاریم.",
        menu: "برای فارسی، کلید {key} را فشار دهید.",
        goodbye: "خداحافظ.",
      },
      wait: {
        connecting: "به زودی با شما تماس گرفته خواهد شد.",
        leaveAMessage: "لطفاً در خط بمانید یا هر کلیدی را فشار دهید تا پیامی بگذارید.",
      },
      record: {
        prompt: "لطفاً پس از صدای زنگ پیامی بگذارید.",
      }
    },
    operator: {
      precall: {
        intro: "این تماس از {hotline name} است. برای پذیرش تماس، هر کلیدی را فشار دهید.",
        introNamed: "این تماس از {caller name} است, از طریق {hotline name}. برای پذیرش تماس, هر کلیدی را فشار دهید.",
        noResponse: "شما پاسخ ندادید, بنابراین ما به اپراتور دیگری میرویم. این تماس از {phone number} بود.",
        reservationStatus: {
          rescinded: "اپراتور دیگری به این تماس پاسخ داد.",
          canceled: "تماس را قطع کرد.",
          default: "کسی دیگر پاسخ داد یا تماس قطع شد.",
        }
      },
      postcall: {
        options: "تماس تمام شد. کلید 1 را فشار دهید تا شماره مکالمه را دوباره بشنوید. کلید 2 را فشار دهید تا مکالمه را به لیست بلاک اضافه کنید. کلید 3 را فشار دهید تا مکالمه را دوباره برقرار کنید.",
        callerNumber: "این تماس از {phone number} بود.",
        blocking: "مکالمات از {phone number} را مسدود می‌کنم.",
        callingBack: "در حال تماس با {phone number}.",
      }
    }
  },
  fr: {
    name: "la ligne communautaire",
    caller: {
      welcome: {
        hello: "Merci d'avoir appelé {hotline name}.",
        menu: "Appuyez sur {key} pour français.",
        goodbye: "Prenez soin de vous.",
      },
      wait: {
        connecting: "Quelqu'un va venir vous voir d'ici peu.",
        connecting: "Quelqu'un sera avec vous sous peu.",
        leaveAMessage: "Veuillez rester en ligne ou appuyez sur n'importe quelle touche pour laisser un message.",
      },
      noOperators: {
        sorry: "Désolé, aucun opérateur parlant français n'est disponible.",
        messageOrLanguage: "Restez en ligne pour laisser un message, ou appuyez sur n'importe quelle touche pour choisir une autre langue.",
        message: "Restez en ligne pour laisser un message.",
        language: "Appuyez sur n'importe quelle touche pour choisir une autre langue.",
      },
      record: {
        prompt: "Veuillez laisser un message après le bip sonore.",
      }
    },
    operator: {
      precall: {
        intro: "Ceci est un appel de {hotline name}. Appuyez sur n'importe quelle touche pour accepter l'appel.",
        introNamed: "Ceci est un appel de {caller name}, via {hotline name}. Appuyez sur n'importe quelle touche pour accepter l'appel.",
        noResponse: "Aucune réponse, nous passons donc à un autre opérateur. Cet appel provenait de {phone number}.",
        reservationStatus: {
          rescinded: "Un autre opérateur a répondu à cet appel.",
          canceled: "La personne en attente a terminé l'appel.",
          default: "L'appel a été terminé.",
        }
      },
      postcall: {
        options: "Appel terminé. Appuyez sur 1 pour écouter le numéro à nouveau. Appuyez sur 2 pour le bloquer. Appuyez sur 3 pour le rappeler.",
        callerNumber: "Cet appel provenait de {phone number}.",
        blocking: "Les appels de {phone number} ont été bloqués.",
        callingBack: "Rappel de {phone number}.",
      }
    }
  }
};

module.exports = { langMap, sayAttrs, sayLangMap, messagesMap, formatE164 };

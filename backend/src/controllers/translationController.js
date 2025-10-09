const { Translate } = require('@google-cloud/translate').v2;

// Initialize Google Translate client
let translate;

try {
  // For development, we'll use API key authentication
  // In production, you should use service account key file
  if (process.env.GOOGLE_TRANSLATE_API_KEY) {
    translate = new Translate({
      key: process.env.GOOGLE_TRANSLATE_API_KEY
    });
  } else {
    console.warn('Google Translate API key not found. Translation will use fallback.');
  }
} catch (error) {
  console.error('Error initializing Google Translate:', error);
}

// Translate text
const translateText = async (req, res) => {
  try {
    const { text, targetLanguage = 'en', sourceLanguage = 'auto' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required for translation' });
    }

    // Fallback translation if Google Translate is not configured
    if (!translate) {
      console.log('Using fallback translation');
      return res.json({
        originalText: text,
        translatedText: `[FALLBACK TRANSLATION] ${text}`,
        sourceLanguage: 'unknown',
        targetLanguage: targetLanguage,
        service: 'fallback'
      });
    }

    // Detect language if source is auto
    let detectedLanguage = sourceLanguage;
    if (sourceLanguage === 'auto') {
      try {
        const [detection] = await translate.detect(text);
        detectedLanguage = detection.language;
      } catch (error) {
        console.error('Language detection failed:', error);
        detectedLanguage = 'unknown';
      }
    }

    // Skip translation if already in target language
    if (detectedLanguage === targetLanguage) {
      return res.json({
        originalText: text,
        translatedText: text,
        sourceLanguage: detectedLanguage,
        targetLanguage: targetLanguage,
        service: 'google-translate',
        note: 'Text is already in target language'
      });
    }

    // Perform translation
    const [translation] = await translate.translate(text, {
      from: detectedLanguage,
      to: targetLanguage
    });

    res.json({
      originalText: text,
      translatedText: translation,
      sourceLanguage: detectedLanguage,
      targetLanguage: targetLanguage,
      service: 'google-translate'
    });

  } catch (error) {
    console.error('Translation error:', error);
    
    // Return fallback translation on error
    res.json({
      originalText: req.body.text,
      translatedText: `[ERROR: Translation failed] ${req.body.text}`,
      sourceLanguage: 'unknown',
      targetLanguage: req.body.targetLanguage || 'en',
      service: 'fallback',
      error: error.message
    });
  }
};

// Get supported languages
const getSupportedLanguages = async (req, res) => {
  try {
    if (!translate) {
      return res.json({
        languages: [
          { code: 'en', name: 'English' },
          { code: 'es', name: 'Spanish' },
          { code: 'fr', name: 'French' },
          { code: 'de', name: 'German' },
          { code: 'hi', name: 'Hindi' },
          { code: 'nl', name: 'Dutch' }
        ],
        service: 'fallback'
      });
    }

    const [languages] = await translate.getLanguages();
    
    res.json({
      languages: languages.map(lang => ({
        code: lang.code,
        name: lang.name
      })),
      service: 'google-translate'
    });

  } catch (error) {
    console.error('Error fetching supported languages:', error);
    res.status(500).json({ error: 'Failed to fetch supported languages' });
  }
};

module.exports = {
  translateText,
  getSupportedLanguages
};
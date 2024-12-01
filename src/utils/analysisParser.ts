interface SentimentData {
  sentiment: Array<{ name: string; value: number }>;
  impact: 'positive' | 'negative' | 'neutral';
  score: number;
}

interface TradingOpportunity {
  pair: string;
  strongCurrency: string;
  weakCurrency: string;
  impact: number;
  reasons: string[];
  direction: 'buy' | 'sell';
  signalStrength: number;
}

const MAJOR_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF',
  'USD/CAD', 'AUD/USD', 'NZD/USD'
];

const CROSS_PAIRS = [
  'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'EUR/CHF',
  'EUR/AUD', 'GBP/AUD', 'EUR/CAD', 'GBP/CAD'
];

export function extractSentimentData(analysis: string): SentimentData {
  const lines = analysis.toLowerCase().split('\n');
  let impact: 'positive' | 'negative' | 'neutral' = 'neutral';
  let score = 0;

  // Recherche plus précise de l'impact
  for (const line of lines) {
    if (line.includes('impact') || line.includes('force') || line.includes('intensité')) {
      const numbers = line.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        score = parseInt(numbers[0], 10);
        if (score > 0) break;
      }
    }
  }

  // Analyse du sentiment
  const positiveWords = [
    'positif', 'haussier', 'bullish', 'hausse', 'augmentation',
    'renforcement', 'amélioration', 'croissance', 'fort', 'optimiste'
  ];
  const negativeWords = [
    'négatif', 'baissier', 'bearish', 'baisse', 'diminution',
    'affaiblissement', 'détérioration', 'déclin', 'faible', 'pessimiste'
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  lines.forEach(line => {
    positiveWords.forEach(word => {
      if (line.includes(word)) positiveCount++;
    });
    negativeWords.forEach(word => {
      if (line.includes(word)) negativeCount++;
    });
  });

  if (positiveCount > negativeCount) impact = 'positive';
  else if (negativeCount > positiveCount) impact = 'negative';

  // Calcul du score si non trouvé
  if (score === 0) {
    score = Math.min(Math.max(Math.abs(positiveCount - negativeCount) + 3, 1), 10);
  }

  const sentiment = [
    { name: 'Impact', value: score },
    { name: 'Signal', value: Math.max(1, Math.floor(score * 0.8)) }
  ];

  return { sentiment, impact, score };
}

export function extractTradingOpportunity(analysis: string): TradingOpportunity | null {
  const lines = analysis.toLowerCase().split('\n');
  let pairs: string[] = [];
  let direction: 'buy' | 'sell' = 'buy';
  let signalStrength = 0;
  let reasons: string[] = [];

  // Recherche des paires de devises
  for (const line of lines) {
    // Cherche toutes les paires de devises mentionnées
    const pairMatches = line.match(/[a-z]{3}\/[a-z]{3}/gi);
    if (pairMatches) {
      pairs.push(...pairMatches.map(p => p.toUpperCase()));
    }
  }

  // Filtre et priorise les paires
  pairs = [...new Set(pairs)].filter(pair => 
    MAJOR_PAIRS.includes(pair) || CROSS_PAIRS.includes(pair)
  );

  // Si aucune paire trouvée, cherche les mentions de devises individuelles
  if (pairs.length === 0) {
    const currencies = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];
    const mentionedCurrencies = currencies.filter(curr => 
      lines.some(line => line.includes(curr.toLowerCase()))
    );
    
    if (mentionedCurrencies.length >= 2) {
      pairs = [mentionedCurrencies.slice(0, 2).join('/')];
    }
  }

  // Analyse de la direction
  const buyWords = [
    'achat', 'hausse', 'bullish', 'haussier', 'augmentation',
    'renforcement', 'appréciation', 'support'
  ];
  const sellWords = [
    'vente', 'baisse', 'bearish', 'baissier', 'diminution',
    'affaiblissement', 'dépréciation', 'résistance'
  ];

  let buyCount = 0;
  let sellCount = 0;

  lines.forEach(line => {
    buyWords.forEach(word => {
      if (line.includes(word)) buyCount++;
    });
    sellWords.forEach(word => {
      if (line.includes(word)) sellCount++;
    });
  });

  direction = buyCount > sellCount ? 'buy' : 'sell';

  // Recherche de la force du signal
  for (const line of lines) {
    if (line.includes('force') || line.includes('signal') || line.includes('impact')) {
      const numbers = line.match(/\d+/);
      if (numbers) {
        signalStrength = parseInt(numbers[0], 10);
        if (signalStrength > 0) break;
      }
    }
  }

  // Extraction des raisons
  const reasonLines = lines.filter(line => 
    line.startsWith('-') || 
    line.startsWith('•') || 
    line.includes('raison') ||
    line.includes('facteur') ||
    line.includes('car')
  );

  reasons = reasonLines
    .map(line => line.replace(/^[-•]/, '').trim())
    .filter(line => line.length > 0 && !line.includes('raison') && !line.includes('facteur'))
    .slice(0, 3);

  if (pairs.length === 0) return null;

  // Sélection de la paire principale
  const pair = pairs[0];

  // Si pas de raisons trouvées, fournir des raisons par défaut
  if (reasons.length === 0) {
    reasons = [
      'Tendance technique confirmée',
      'Contexte macroéconomique favorable',
      'Momentum du marché'
    ];
  }

  const [strongCurrency, weakCurrency] = direction === 'buy' 
    ? pair.split('/') 
    : pair.split('/').reverse();

  // Assure que le signal est entre 1 et 10
  signalStrength = signalStrength || Math.floor(Math.random() * 5) + 5;
  signalStrength = Math.min(Math.max(signalStrength, 1), 10);

  return {
    pair,
    strongCurrency,
    weakCurrency,
    impact: signalStrength,
    reasons,
    direction,
    signalStrength
  };
}
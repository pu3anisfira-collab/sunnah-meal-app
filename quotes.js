export const quotes = [
  "The son of Adam does not fill any vessel worse than his stomach. It is sufficient for the son of Adam to eat a few mouthfuls to keep his back straight. If he must fill it, then one third for his food, one third for his drink, and one third for his breath. - Prophet Muhammad ﷺ (Tirmidhi)",
  "Eat and drink, but waste not by extravagance. Certainly, He (Allah) likes not the wasteful. - Qur'an 7:31",
  "The believer eats in one intestine, and the disbeliever eats in seven intestines. - Prophet Muhammad ﷺ (Bukhari)",
  "And We made every living thing from water. Will they not then believe? - Qur'an 21:30",
  "He who does not thank the people is not thankful to Allah. - Prophet Muhammad ﷺ (Tirmidhi)",
  "When one of you eats, let him mention the name of Allah. If he forgets to mention the name of Allah at the beginning, let him say: 'In the name of Allah at its beginning and its end.' - Prophet Muhammad ﷺ (Tirmidhi)"
];

export function getRandomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}
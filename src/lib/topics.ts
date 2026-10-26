// Themed verse collections ("Tema"). Our own selection of well-known verses; each is a
// surah:ayah reference into the bundled text, so the wording always comes from the Quran data.
export type Topic = { id: string; title: string; subtitle: string; refs: [number, number][] };

export const TOPICS: Topic[] = [
  { id: 'durimi', title: 'Durimi', subtitle: 'Kur gjërat rëndohen', refs: [[2, 153], [2, 155], [2, 156], [2, 157], [3, 200], [39, 10], [94, 5], [94, 6]] },
  { id: 'trishtimi', title: 'Ankthi dhe trishtimi', subtitle: 'Qetësi për zemrën', refs: [[13, 28], [9, 40], [12, 86], [2, 286], [65, 2], [65, 3], [94, 5], [94, 6]] },
  { id: 'mirenjohja', title: 'Mirënjohja', subtitle: 'Falënderimi i shton të mirat', refs: [[14, 7], [2, 152], [31, 12], [16, 18]] },
  { id: 'prinderit', title: 'Prindërit', subtitle: 'Mirësia ndaj tyre', refs: [[17, 23], [17, 24], [31, 14], [46, 15]] },
  { id: 'falja', title: 'Falja', subtitle: 'Mëshira e Allahut është e gjerë', refs: [[39, 53], [4, 110], [3, 133], [3, 134], [24, 22]] },
  { id: 'lutja', title: 'Lutja', subtitle: 'Ai është afër', refs: [[2, 186], [40, 60], [7, 55]] },
  { id: 'mbeshtetja', title: 'Mbështetja tek Allahu', subtitle: 'Tevekkuli', refs: [[65, 3], [3, 159], [8, 2], [9, 51]] },
  { id: 'bamiresia', title: 'Bamirësia', subtitle: 'Sadakaja nuk e pakëson pasurinë', refs: [[2, 261], [2, 271], [2, 274], [64, 16]] },
  { id: 'drejtesia', title: 'Drejtësia', subtitle: 'Edhe kur është e vështirë', refs: [[4, 135], [5, 8], [16, 90]] },
  { id: 'miresia', title: 'Mirësia dhe sjellja', subtitle: 'Fjala e mirë', refs: [[41, 34], [25, 63], [17, 53], [3, 134]] },
  { id: 'namazi', title: 'Namazi', subtitle: 'Lidhja e përditshme', refs: [[2, 45], [29, 45], [20, 14], [2, 238]] },
  { id: 'jeta', title: 'Jeta dhe vdekja', subtitle: 'Kujtimi i qëllimit', refs: [[3, 185], [67, 2], [29, 57]] },
];

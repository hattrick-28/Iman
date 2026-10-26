import { Body, Card, Gap, Header, Kicker, Screen, Small } from '@/components/ui';
import { S } from '@/lib/theme';

const ITEMS = [
  ['Teksti arab i Kur\'anit', 'Teksti Uthmani nga Tanzil.net dhe Quran Academy. Teksti nuk është ndryshuar.'],
  ['Përkthimi i Sherif Ahmetit', 'Përkthimi shqip i kuptimeve të Kur\'anit, nga Sherif Ahmeti.'],
  ['Përkthimi i Hassan Nahit', 'Përkthimi shqip i kuptimeve të Kur\'anit, nga Hassan Nahi (QuranEnc).'],
  ['Transliterimi', 'Tanzil.net'],
  ['Të dhënat e faqeve dhe xhuzeve', 'fawazahmed0/quran-api'],
  ['Fontet', 'Amiri Quran, Oswald, Cormorant SC dhe Inter, me licencën SIL Open Font License.'],
];

export default function Credits() {
  return (
    <Screen header={<Header title="Burimet" />}>
      <Body muted>Imani nuk do të ishte i mundur pa punën e këtyre njerëzve dhe projekteve. Allahu i shpërbleftë.</Body>
      <Gap />
      {ITEMS.map(([t, d]) => (
        <Card key={t} style={{ marginBottom: S.sm }}>
          <Kicker>{t}</Kicker>
          <Gap h={S.xs} />
          <Small>{d}</Small>
        </Card>
      ))}
      <Gap />
      <Small>Përkthimet janë përkthime të kuptimeve, jo vetë Kur’ani. Për çështje fetare, pyet një dijetar.</Small>
    </Screen>
  );
}

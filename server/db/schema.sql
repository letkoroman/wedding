CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jmeno TEXT NOT NULL,
  typ TEXT NOT NULL,
  pocet_deti INTEGER NOT NULL DEFAULT 0,
  potvrzeni TEXT NOT NULL,
  must_have BOOLEAN NOT NULL DEFAULT false,
  poznamka TEXT NOT NULL DEFAULT '',
  pocet_izieb INTEGER NOT NULL DEFAULT 0,
  ubytovani_od DATE,
  ubytovani_do DATE
);

CREATE TABLE IF NOT EXISTS agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nazev TEXT NOT NULL,
  cas_zacatku TEXT NOT NULL,
  trvani INTEGER NOT NULL,
  ikona TEXT NOT NULL,
  poznamka TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nazev TEXT NOT NULL,
  prirazeno TEXT NOT NULL DEFAULT '',
  termin DATE,
  stav TEXT NOT NULL,
  priorita TEXT NOT NULL,
  poznamka TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nazev TEXT NOT NULL,
  pocet_izieb INTEGER NOT NULL DEFAULT 0,
  termin_od DATE NOT NULL,
  termin_do DATE NOT NULL,
  poznamka TEXT NOT NULL DEFAULT ''
);

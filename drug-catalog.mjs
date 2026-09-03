/**
 * Offline pharmacological catalog — brand names + active ingredients (IT/EU common).
 * Tracking-only; not medical advice.
 */

function foldDrug(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** @type {{ brand: string, ingredient: string, atc?: string, forms?: string[], aliases?: string[] }[]} */
export const DRUG_CATALOG = [
  {
    "brand": "Anadrol",
    "ingredient": "Oxymetholone",
    "category": "AAS / Androgeni",
    "aliases": [
      "oxymetholone",
      "adrol"
    ],
    "defaultDose": "50 mg"
  },
  {
    "brand": "Anavar",
    "ingredient": "Oxandrolone",
    "category": "AAS / Androgeni",
    "aliases": [
      "oxandrolone"
    ],
    "defaultDose": "20 mg"
  },
  {
    "brand": "Arimidex",
    "ingredient": "Anastrozolo",
    "category": "AAS / Androgeni",
    "aliases": [
      "anastrozole",
      "ai"
    ],
    "defaultDose": "0.5 mg"
  },
  {
    "brand": "Aromasin",
    "ingredient": "Exemestane",
    "category": "AAS / Androgeni",
    "aliases": [
      "exemestane"
    ],
    "defaultDose": "12.5 mg"
  },
  {
    "brand": "Cardarine",
    "ingredient": "GW501516",
    "category": "AAS / Androgeni",
    "aliases": [
      "gw501516"
    ],
    "defaultDose": "10 mg"
  },
  {
    "brand": "Clomid",
    "ingredient": "Clomifene",
    "category": "AAS / Androgeni",
    "aliases": [
      "clomifene",
      "clomiphene"
    ],
    "defaultDose": "50 mg"
  },
  {
    "brand": "Dianabol",
    "ingredient": "Metandrostenolone",
    "category": "AAS / Androgeni",
    "aliases": [
      "dbol",
      "methandienone"
    ],
    "defaultDose": "20 mg"
  },
  {
    "brand": "Equipoise",
    "ingredient": "Boldenone undecilenato",
    "category": "AAS / Androgeni",
    "aliases": [
      "boldenone",
      "eq"
    ],
    "defaultDose": "300 mg"
  },
  {
    "brand": "Halotestin",
    "ingredient": "Fluoximesterone",
    "category": "AAS / Androgeni",
    "aliases": [
      "fluoxymesterone"
    ],
    "defaultDose": "10 mg"
  },
  {
    "brand": "Letrozolo",
    "ingredient": "Letrozolo",
    "category": "AAS / Androgeni",
    "aliases": [
      "femara"
    ],
    "defaultDose": "2.5 mg"
  },
  {
    "brand": "Ligandrol",
    "ingredient": "LGD-4033",
    "category": "AAS / Androgeni",
    "aliases": [
      "lgd4033"
    ],
    "defaultDose": "5 mg"
  },
  {
    "brand": "Masteron",
    "ingredient": "Drostanolone propionato",
    "category": "AAS / Androgeni",
    "aliases": [
      "drostanolone"
    ],
    "defaultDose": "100 mg"
  },
  {
    "brand": "Nandrolone Decanoato",
    "ingredient": "Nandrolone decanoato",
    "category": "AAS / Androgeni",
    "aliases": [
      "deca",
      "deca-durabolin"
    ],
    "defaultDose": "200 mg"
  },
  {
    "brand": "Nandrolone Fenilpropionato",
    "ingredient": "Nandrolone fenilpropionato",
    "category": "AAS / Androgeni",
    "aliases": [
      "npp",
      "durabolin"
    ],
    "defaultDose": "100 mg"
  },
  {
    "brand": "Nolvadex",
    "ingredient": "Tamoxifene",
    "category": "AAS / Androgeni",
    "aliases": [
      "tamoxifene",
      "serm"
    ],
    "defaultDose": "20 mg"
  },
  {
    "brand": "Ostarine",
    "ingredient": "MK-2866",
    "category": "AAS / Androgeni",
    "aliases": [
      "mk2866",
      "enobosarm"
    ],
    "defaultDose": "15 mg"
  },
  {
    "brand": "Primobolan",
    "ingredient": "Metenolone enantato",
    "category": "AAS / Androgeni",
    "aliases": [
      "primo",
      "metenolone"
    ],
    "defaultDose": "200 mg"
  },
  {
    "brand": "Proviron",
    "ingredient": "Mesterolone",
    "category": "AAS / Androgeni",
    "aliases": [
      "mesterolone"
    ],
    "defaultDose": "25 mg"
  },
  {
    "brand": "RAD-140",
    "ingredient": "Testolone",
    "category": "AAS / Androgeni",
    "aliases": [
      "testolone"
    ],
    "defaultDose": "10 mg"
  },
  {
    "brand": "Stenabolic",
    "ingredient": "SR9009",
    "category": "AAS / Androgeni",
    "aliases": [
      "sr9009"
    ],
    "defaultDose": "20 mg"
  },
  {
    "brand": "Sustanon",
    "ingredient": "Testosterone blend",
    "category": "AAS / Androgeni",
    "aliases": [
      "sustanon 250"
    ],
    "defaultDose": "250 mg"
  },
  {
    "brand": "Testosterone Cipionato",
    "ingredient": "Testosterone cipionato",
    "category": "AAS / Androgeni",
    "aliases": [
      "test c",
      "cipionato"
    ],
    "defaultDose": "200 mg"
  },
  {
    "brand": "Testosterone Enantato",
    "ingredient": "Testosterone enantato",
    "category": "AAS / Androgeni",
    "aliases": [
      "test e",
      "enantato"
    ],
    "defaultDose": "250 mg"
  },
  {
    "brand": "Testosterone Propionato",
    "ingredient": "Testosterone propionato",
    "category": "AAS / Androgeni",
    "aliases": [
      "test p"
    ],
    "defaultDose": "100 mg"
  },
  {
    "brand": "Trenbolone Acetato",
    "ingredient": "Trenbolone acetato",
    "category": "AAS / Androgeni",
    "aliases": [
      "tren a"
    ],
    "defaultDose": "50 mg"
  },
  {
    "brand": "Trenbolone Enantato",
    "ingredient": "Trenbolone enantato",
    "category": "AAS / Androgeni",
    "aliases": [
      "tren e"
    ],
    "defaultDose": "200 mg"
  },
  {
    "brand": "Turinabol",
    "ingredient": "Clorodeidrometiltestosterone",
    "category": "AAS / Androgeni",
    "aliases": [
      "tbol"
    ],
    "defaultDose": "20 mg"
  },
  {
    "brand": "Winstrol",
    "ingredient": "Stanozololo",
    "category": "AAS / Androgeni",
    "aliases": [
      "stanozolol",
      "winny"
    ],
    "defaultDose": "25 mg"
  },
  {
    "brand": "YK-11",
    "ingredient": "YK-11",
    "category": "AAS / Androgeni",
    "aliases": [],
    "defaultDose": "5 mg"
  },
  {
    "brand": "Abilify",
    "ingredient": "Aripiprazolo",
    "atc": "N05AX12",
    "category": "Altro"
  },
  {
    "brand": "Actos",
    "ingredient": "Pioglitazone",
    "atc": "A10BG03",
    "category": "Altro"
  },
  {
    "brand": "Aerius",
    "ingredient": "Desloratadina",
    "atc": "R06AX27",
    "category": "Altro"
  },
  {
    "brand": "Aldactone",
    "ingredient": "Spironolattone",
    "atc": "C03DA01",
    "category": "Altro"
  },
  {
    "brand": "Allopurinolo",
    "ingredient": "Allopurinolo",
    "atc": "M04AA01",
    "aliases": [
      "zyloric"
    ],
    "category": "Altro"
  },
  {
    "brand": "Blopress",
    "ingredient": "Candesartan",
    "atc": "C09CA06",
    "category": "Altro"
  },
  {
    "brand": "Byetta",
    "ingredient": "Exenatide",
    "atc": "A10BJ01",
    "category": "Altro"
  },
  {
    "brand": "Cialis",
    "ingredient": "Tadalafil",
    "atc": "G04BE08",
    "category": "Altro"
  },
  {
    "brand": "Clarityn",
    "ingredient": "Loratadina",
    "atc": "R06AX13",
    "aliases": [
      "loratadina"
    ],
    "category": "Altro"
  },
  {
    "brand": "Clenil",
    "ingredient": "Beclometasone",
    "atc": "R03BA01",
    "category": "Altro"
  },
  {
    "brand": "Colchicina",
    "ingredient": "Colchicina",
    "atc": "M04AC01",
    "category": "Altro"
  },
  {
    "brand": "Cordarone",
    "ingredient": "Amiodarone",
    "atc": "C01BD01",
    "aliases": [
      "amiodarone"
    ],
    "category": "Altro"
  },
  {
    "brand": "Corlentor",
    "ingredient": "Ivabradina",
    "atc": "C01EB17",
    "category": "Altro"
  },
  {
    "brand": "Coumadin",
    "ingredient": "Warfarin",
    "atc": "B01AA03",
    "aliases": [
      "warfarin"
    ],
    "category": "Altro"
  },
  {
    "brand": "Cozaar",
    "ingredient": "Losartan",
    "atc": "C09CA01",
    "aliases": [
      "losartan"
    ],
    "category": "Altro"
  },
  {
    "brand": "Cyclosporin",
    "ingredient": "Ciclosporina",
    "atc": "L04AD01",
    "aliases": [
      "ciclosporina",
      "sandimmun"
    ],
    "category": "Altro"
  },
  {
    "brand": "Cymbalta",
    "ingredient": "Duloxetina",
    "atc": "N06AX21",
    "category": "Altro"
  },
  {
    "brand": "Deltacortene",
    "ingredient": "Prednisone",
    "atc": "H02AB07",
    "aliases": [
      "prednisone"
    ],
    "category": "Altro"
  },
  {
    "brand": "Depakin",
    "ingredient": "Acido valproico",
    "atc": "N03AG01",
    "category": "Altro"
  },
  {
    "brand": "Deursil",
    "ingredient": "Acido ursodesossicolico",
    "atc": "A05AA02",
    "category": "Altro"
  },
  {
    "brand": "Dibase",
    "ingredient": "Colecalciferolo",
    "atc": "A11CC05",
    "aliases": [
      "vitamina d",
      "vitamina d3",
      "diteven"
    ],
    "category": "Altro"
  },
  {
    "brand": "Digossina",
    "ingredient": "Digossina",
    "atc": "C01AA05",
    "aliases": [
      "lanoxin"
    ],
    "category": "Altro"
  },
  {
    "brand": "Dioavan",
    "ingredient": "Valsartan",
    "atc": "C09CA03",
    "aliases": [
      "valsartan",
      "diovan"
    ],
    "category": "Altro"
  },
  {
    "brand": "Dulcolax",
    "ingredient": "Bisacodile",
    "atc": "A06AB02",
    "category": "Altro"
  },
  {
    "brand": "Efexor",
    "ingredient": "Venlafaxina",
    "atc": "N06AX16",
    "category": "Altro"
  },
  {
    "brand": "Efient",
    "ingredient": "Prasugrel",
    "atc": "B01AC22",
    "category": "Altro"
  },
  {
    "brand": "Enapren",
    "ingredient": "Enalapril",
    "atc": "C09AA02",
    "aliases": [
      "enalapril"
    ],
    "category": "Altro"
  },
  {
    "brand": "Enbrel",
    "ingredient": "Etanercept",
    "atc": "L04AB01",
    "category": "Altro"
  },
  {
    "brand": "Enterogermina",
    "ingredient": "Bacillus clausii",
    "atc": "A07FA01",
    "category": "Altro"
  },
  {
    "brand": "Entresto",
    "ingredient": "Sacubitril + Valsartan",
    "atc": "C09DX04",
    "category": "Altro"
  },
  {
    "brand": "Eutimil",
    "ingredient": "Paroxetina",
    "atc": "N06AB05",
    "category": "Altro"
  },
  {
    "brand": "Ezetrol",
    "ingredient": "Ezetimibe",
    "atc": "C10AX09",
    "category": "Altro"
  },
  {
    "brand": "Ferrograd",
    "ingredient": "Solfato ferroso",
    "atc": "B03AA07",
    "aliases": [
      "ferro"
    ],
    "category": "Altro"
  },
  {
    "brand": "Finasteride",
    "ingredient": "Finasteride",
    "atc": "G04CB01",
    "aliases": [
      "propecia",
      "proscar"
    ],
    "category": "Altro"
  },
  {
    "brand": "Flecainide",
    "ingredient": "Flecainide",
    "atc": "C01BC04",
    "category": "Altro"
  },
  {
    "brand": "Folifill",
    "ingredient": "Acido folico",
    "atc": "B03BB01",
    "aliases": [
      "acido folico",
      "folina"
    ],
    "category": "Altro"
  },
  {
    "brand": "Forxiga",
    "ingredient": "Dapagliflozin",
    "atc": "A10BK01",
    "category": "Altro"
  },
  {
    "brand": "Fosamax",
    "ingredient": "Alendronato",
    "atc": "M05BA04",
    "category": "Altro"
  },
  {
    "brand": "Fragmin",
    "ingredient": "Dalteparina",
    "atc": "B01AB04",
    "category": "Altro"
  },
  {
    "brand": "Glibenclamide",
    "ingredient": "Glibenclamide",
    "atc": "A10BB01",
    "category": "Altro"
  },
  {
    "brand": "Humira",
    "ingredient": "Adalimumab",
    "atc": "L04AB04",
    "category": "Altro"
  },
  {
    "brand": "Imodium",
    "ingredient": "Loperamide",
    "atc": "A07DA03",
    "category": "Altro"
  },
  {
    "brand": "Imuran",
    "ingredient": "Azatioprina",
    "atc": "L04AX01",
    "category": "Altro"
  },
  {
    "brand": "Inderal",
    "ingredient": "Propranololo",
    "atc": "C07AA05",
    "category": "Altro"
  },
  {
    "brand": "Isoptin",
    "ingredient": "Verapamil",
    "atc": "C08DA01",
    "category": "Altro"
  },
  {
    "brand": "Isotretinoina",
    "ingredient": "Isotretinoina",
    "atc": "D10BA01",
    "aliases": [
      "roaccutan",
      "isotretinoin"
    ],
    "category": "Altro"
  },
  {
    "brand": "Januvia",
    "ingredient": "Sitagliptin",
    "atc": "A10BH01",
    "category": "Altro"
  },
  {
    "brand": "Klacid",
    "ingredient": "Claritromicina",
    "atc": "J01FA09",
    "category": "Altro"
  },
  {
    "brand": "Latuda",
    "ingredient": "Lurasidone",
    "atc": "N05AE05",
    "category": "Altro"
  },
  {
    "brand": "Lixiana",
    "ingredient": "Edoxaban",
    "atc": "B01AF03",
    "category": "Altro"
  },
  {
    "brand": "Mag2",
    "ingredient": "Magnesio pidolato",
    "atc": "A12CC08",
    "aliases": [
      "magnesio"
    ],
    "category": "Altro"
  },
  {
    "brand": "Medrol",
    "ingredient": "Metilprednisolone",
    "atc": "H02AB04",
    "category": "Altro"
  },
  {
    "brand": "Melatonina",
    "ingredient": "Melatonina",
    "atc": "N05CH01",
    "category": "Altro"
  },
  {
    "brand": "Methotrexate",
    "ingredient": "Metotrexato",
    "atc": "L01BA01",
    "aliases": [
      "metotrexato"
    ],
    "category": "Altro"
  },
  {
    "brand": "Minoxidil",
    "ingredient": "Minoxidil",
    "atc": "D11AX01",
    "category": "Altro"
  },
  {
    "brand": "Motilium",
    "ingredient": "Domperidone",
    "atc": "A03FA03",
    "category": "Altro"
  },
  {
    "brand": "Movicol",
    "ingredient": "Macrogol",
    "atc": "A06AD15",
    "category": "Altro"
  },
  {
    "brand": "NAC",
    "ingredient": "N-Acetilcisteina",
    "category": "Altro",
    "aliases": [
      "n-acetylcysteine"
    ],
    "defaultDose": "600 mg"
  },
  {
    "brand": "Nitroglicerina",
    "ingredient": "Nitroglicerina",
    "atc": "C01DA02",
    "aliases": [
      "trinitrina",
      "nitrolingual"
    ],
    "category": "Altro"
  },
  {
    "brand": "Omnic",
    "ingredient": "Tamsulosina",
    "atc": "G04CA02",
    "aliases": [
      "tamsulosina"
    ],
    "category": "Altro"
  },
  {
    "brand": "Oxycontin",
    "ingredient": "Ossicodone",
    "atc": "N02AA05",
    "category": "Altro"
  },
  {
    "brand": "Plasil",
    "ingredient": "Metoclopramide",
    "atc": "A03FA01",
    "category": "Altro"
  },
  {
    "brand": "Potassium",
    "ingredient": "Cloruro di potassio",
    "atc": "A12BA01",
    "aliases": [
      "potassio",
      "kcl"
    ],
    "category": "Altro"
  },
  {
    "brand": "Praluent",
    "ingredient": "Alirocumab",
    "atc": "C10AX14",
    "category": "Altro"
  },
  {
    "brand": "Prolia",
    "ingredient": "Denosumab",
    "atc": "M05BX04",
    "category": "Altro"
  },
  {
    "brand": "Ranexa",
    "ingredient": "Ranolazina",
    "atc": "C01EB18",
    "category": "Altro"
  },
  {
    "brand": "Ranitidina",
    "ingredient": "Ranitidina",
    "atc": "A02BA02",
    "category": "Altro"
  },
  {
    "brand": "Repatha",
    "ingredient": "Evolocumab",
    "atc": "C10AX13",
    "category": "Altro"
  },
  {
    "brand": "Risperdal",
    "ingredient": "Risperidone",
    "atc": "N05AX08",
    "category": "Altro"
  },
  {
    "brand": "Rocefin",
    "ingredient": "Ceftriaxone",
    "atc": "J01DD04",
    "category": "Altro"
  },
  {
    "brand": "Seloken",
    "ingredient": "Metoprololo",
    "atc": "C07AB02",
    "aliases": [
      "metoprololo"
    ],
    "category": "Altro"
  },
  {
    "brand": "Seretide",
    "ingredient": "Fluticasone + Salmeterolo",
    "atc": "R03AK06",
    "category": "Altro"
  },
  {
    "brand": "Singulair",
    "ingredient": "Montelukast",
    "atc": "R03DC03",
    "category": "Altro"
  },
  {
    "brand": "Sintrom",
    "ingredient": "Acenocumarolo",
    "atc": "B01AA07",
    "category": "Altro"
  },
  {
    "brand": "Sirdalud",
    "ingredient": "Tizanidina",
    "atc": "M03BX02",
    "category": "Altro"
  },
  {
    "brand": "Spasmomen",
    "ingredient": "Otilonio bromuro",
    "atc": "A03AB06",
    "category": "Altro"
  },
  {
    "brand": "Stilnox",
    "ingredient": "Zolpidem",
    "atc": "N05CF02",
    "category": "Altro"
  },
  {
    "brand": "Tamiflu",
    "ingredient": "Oseltamivir",
    "atc": "J05AH02",
    "category": "Altro"
  },
  {
    "brand": "Tapazole",
    "ingredient": "Metimazolo",
    "atc": "H03BB02",
    "aliases": [
      "metimazolo"
    ],
    "category": "Altro"
  },
  {
    "brand": "Tegretol",
    "ingredient": "Carbamazepina",
    "atc": "N03AF01",
    "category": "Altro"
  },
  {
    "brand": "Telfast",
    "ingredient": "Fexofenadina",
    "atc": "R06AX26",
    "category": "Altro"
  },
  {
    "brand": "Tiklid",
    "ingredient": "Ticlopidina",
    "atc": "B01AC05",
    "category": "Altro"
  },
  {
    "brand": "Toradol",
    "ingredient": "Ketorolac",
    "atc": "M01AB15",
    "category": "Altro"
  },
  {
    "brand": "Trulicity",
    "ingredient": "Dulaglutide",
    "atc": "A10BJ05",
    "category": "Altro"
  },
  {
    "brand": "Ursobil",
    "ingredient": "Acido ursodesossicolico",
    "atc": "A05AA02",
    "category": "Altro"
  },
  {
    "brand": "Ventolin",
    "ingredient": "Salbutamolo",
    "atc": "R03AC02",
    "aliases": [
      "salbutamolo"
    ],
    "category": "Altro"
  },
  {
    "brand": "Viagra",
    "ingredient": "Sildenafil",
    "atc": "G04BE03",
    "aliases": [
      "sildenafil"
    ],
    "category": "Altro"
  },
  {
    "brand": "Victoza",
    "ingredient": "Liraglutide",
    "atc": "A10BJ02",
    "category": "Altro"
  },
  {
    "brand": "Zestril",
    "ingredient": "Lisinopril",
    "atc": "C09AA03",
    "category": "Altro"
  },
  {
    "brand": "Zirtec",
    "ingredient": "Cetirizina",
    "atc": "R06AE07",
    "aliases": [
      "cetirizina"
    ],
    "category": "Altro"
  },
  {
    "brand": "Aciclovir",
    "ingredient": "Aciclovir",
    "atc": "J05AB01",
    "aliases": [
      "zovirax"
    ],
    "category": "Antibiotico / Antivirale"
  },
  {
    "brand": "Augmentin",
    "ingredient": "Amoxicillina + Acido clavulanico",
    "atc": "J01CR02",
    "aliases": [
      "amoxicillina"
    ],
    "category": "Antibiotico / Antivirale"
  },
  {
    "brand": "Bactrim",
    "ingredient": "Sulfametoxazolo + Trimetoprim",
    "atc": "J01EE01",
    "category": "Antibiotico / Antivirale"
  },
  {
    "brand": "Ciproxin",
    "ingredient": "Ciprofloxacina",
    "atc": "J01MA02",
    "category": "Antibiotico / Antivirale"
  },
  {
    "brand": "Flagyl",
    "ingredient": "Metronidazolo",
    "atc": "J01XD01",
    "category": "Antibiotico / Antivirale"
  },
  {
    "brand": "Zitromax",
    "ingredient": "Azitromicina",
    "atc": "J01FA10",
    "aliases": [
      "azitromicina"
    ],
    "category": "Antibiotico / Antivirale"
  },
  {
    "brand": "Aulin",
    "ingredient": "Nimesulide",
    "atc": "M01AX17",
    "aliases": [
      "nimesulide"
    ],
    "category": "Antinfiammatorio / Dolore"
  },
  {
    "brand": "Brufen",
    "ingredient": "Ibuprofene",
    "atc": "M01AE01",
    "aliases": [
      "ibuprofene",
      "moment"
    ],
    "category": "Antinfiammatorio / Dolore"
  },
  {
    "brand": "Contramal",
    "ingredient": "Tramadol",
    "atc": "N02AX02",
    "aliases": [
      "tramadol"
    ],
    "category": "Antinfiammatorio / Dolore"
  },
  {
    "brand": "Muscoril",
    "ingredient": "Tiocolchicoside",
    "atc": "M03BX05",
    "category": "Antinfiammatorio / Dolore"
  },
  {
    "brand": "OKI",
    "ingredient": "Ketoprofene",
    "atc": "M01AE03",
    "aliases": [
      "ketoprofene",
      "orudis"
    ],
    "category": "Antinfiammatorio / Dolore"
  },
  {
    "brand": "Tachipirina",
    "ingredient": "Paracetamolo",
    "atc": "N02BE01",
    "aliases": [
      "paracetamolo",
      "efferalgan",
      "acetaminofene"
    ],
    "category": "Antinfiammatorio / Dolore"
  },
  {
    "brand": "Valium",
    "ingredient": "Diazepam",
    "atc": "N05BA01",
    "aliases": [
      "diazepam"
    ],
    "category": "Antinfiammatorio / Dolore"
  },
  {
    "brand": "Voltaren",
    "ingredient": "Diclofenac",
    "atc": "M01AB05",
    "aliases": [
      "diclofenac"
    ],
    "category": "Antinfiammatorio / Dolore"
  },
  {
    "brand": "Aspirina",
    "ingredient": "Acido acetilsalicilico",
    "atc": "N02BA01",
    "aliases": [
      "asa",
      "aspirinetta"
    ],
    "category": "Cardiovascolare"
  },
  {
    "brand": "Atorvastatina",
    "ingredient": "Atorvastatina",
    "atc": "C10AA05",
    "aliases": [
      "torvast",
      "totalip"
    ],
    "category": "Cardiovascolare"
  },
  {
    "brand": "Bentelan",
    "ingredient": "Betametasone",
    "atc": "H02AB01",
    "aliases": [
      "betametasone"
    ],
    "category": "Cardiovascolare"
  },
  {
    "brand": "Bisoprololo",
    "ingredient": "Bisoprololo",
    "atc": "C07AB07",
    "aliases": [
      "concor"
    ],
    "category": "Cardiovascolare"
  },
  {
    "brand": "Brilique",
    "ingredient": "Ticagrelor",
    "atc": "B01AC24",
    "category": "Cardiovascolare"
  },
  {
    "brand": "Cardioaspirin",
    "ingredient": "Acido acetilsalicilico",
    "atc": "B01AC06",
    "aliases": [
      "cardiaspirina",
      "aspirina cardio"
    ],
    "category": "Cardiovascolare"
  },
  {
    "brand": "Clexane",
    "ingredient": "Enoxaparina",
    "atc": "B01AB05",
    "category": "Cardiovascolare"
  },
  {
    "brand": "Crestor",
    "ingredient": "Rosuvastatina",
    "atc": "C10AA07",
    "aliases": [
      "rosuvastatina"
    ],
    "category": "Cardiovascolare"
  },
  {
    "brand": "Dilatrend",
    "ingredient": "Carvedilolo",
    "atc": "C07AG02",
    "aliases": [
      "carvedilolo"
    ],
    "category": "Cardiovascolare"
  },
  {
    "brand": "Eliquis",
    "ingredient": "Apixaban",
    "atc": "B01AF02",
    "category": "Cardiovascolare"
  },
  {
    "brand": "Heparin",
    "ingredient": "Eparina",
    "atc": "B01AB01",
    "aliases": [
      "eparina",
      "clexane",
      "enoxaparina"
    ],
    "category": "Cardiovascolare"
  },
  {
    "brand": "Lasix",
    "ingredient": "Furosemide",
    "atc": "C03CA01",
    "category": "Cardiovascolare"
  },
  {
    "brand": "Micardis",
    "ingredient": "Telmisartan",
    "atc": "C09CA07",
    "aliases": [
      "telmisartan"
    ],
    "category": "Cardiovascolare"
  },
  {
    "brand": "Nebivololo",
    "ingredient": "Nebivololo",
    "atc": "C07AB12",
    "aliases": [
      "lobivon",
      "nebivolol"
    ],
    "category": "Cardiovascolare"
  },
  {
    "brand": "Norvasc",
    "ingredient": "Amlodipina",
    "atc": "C08CA01",
    "aliases": [
      "amlodipina"
    ],
    "category": "Cardiovascolare"
  },
  {
    "brand": "Plavix",
    "ingredient": "Clopidogrel",
    "atc": "B01AC04",
    "category": "Cardiovascolare"
  },
  {
    "brand": "Pradaxa",
    "ingredient": "Dabigatran",
    "atc": "B01AE07",
    "category": "Cardiovascolare"
  },
  {
    "brand": "Simvastatina",
    "ingredient": "Simvastatina",
    "atc": "C10AA01",
    "aliases": [
      "sivastin",
      "zocor"
    ],
    "category": "Cardiovascolare"
  },
  {
    "brand": "Triatec",
    "ingredient": "Ramipril",
    "atc": "C09AA05",
    "aliases": [
      "ramipril"
    ],
    "category": "Cardiovascolare"
  },
  {
    "brand": "Xarelto",
    "ingredient": "Rivaroxaban",
    "atc": "B01AF01",
    "category": "Cardiovascolare"
  },
  {
    "brand": "Antra",
    "ingredient": "Omeprazolo",
    "atc": "A02BC01",
    "aliases": [
      "omeprazolo",
      "mepral"
    ],
    "category": "GI / IPP"
  },
  {
    "brand": "Buscopan",
    "ingredient": "Butilscopolamina",
    "atc": "A03BB01",
    "category": "GI / IPP"
  },
  {
    "brand": "Gaviscon",
    "ingredient": "Alginato di sodio",
    "atc": "A02BX13",
    "category": "GI / IPP"
  },
  {
    "brand": "Lansox",
    "ingredient": "Lansoprazolo",
    "atc": "A02BC03",
    "aliases": [
      "lansoprazolo"
    ],
    "category": "GI / IPP"
  },
  {
    "brand": "Maalox",
    "ingredient": "Alluminio / Magnesio idrossido",
    "atc": "A02AD01",
    "category": "GI / IPP"
  },
  {
    "brand": "Nexium",
    "ingredient": "Esomeprazolo",
    "atc": "A02BC05",
    "category": "GI / IPP"
  },
  {
    "brand": "Normix",
    "ingredient": "Rifaximina",
    "atc": "A07AA11",
    "category": "GI / IPP"
  },
  {
    "brand": "Pantoprazolo",
    "ingredient": "Pantoprazolo",
    "atc": "A02BC02",
    "category": "GI / IPP"
  },
  {
    "brand": "Pantorc",
    "ingredient": "Pantoprazolo",
    "atc": "A02BC02",
    "aliases": [
      "pantoprazolo"
    ],
    "category": "GI / IPP"
  },
  {
    "brand": "TUDCA",
    "ingredient": "Acido tauroursodesossicolico",
    "category": "GI / IPP",
    "aliases": [
      "tauroursodeoxycholic"
    ],
    "defaultDose": "500 mg"
  },
  {
    "brand": "UDCA",
    "ingredient": "Acido ursodesossicolico",
    "category": "GI / IPP",
    "aliases": [
      "ursobil",
      "deursil"
    ],
    "defaultDose": "300 mg"
  },
  {
    "brand": "Amaryl",
    "ingredient": "Glimepiride",
    "atc": "A10BB12",
    "category": "Metabolico / Diabete"
  },
  {
    "brand": "Glucophage",
    "ingredient": "Metformina",
    "atc": "A10BA02",
    "category": "Metabolico / Diabete"
  },
  {
    "brand": "Insulin Regular",
    "ingredient": "Insulina umana",
    "category": "Metabolico / Diabete",
    "aliases": [
      "actrapid"
    ],
    "defaultDose": "per U"
  },
  {
    "brand": "Jardiance",
    "ingredient": "Empagliflozin",
    "atc": "A10BK03",
    "category": "Metabolico / Diabete"
  },
  {
    "brand": "Lantus",
    "ingredient": "Insulina glargine",
    "atc": "A10AE04",
    "aliases": [
      "insulina",
      "humalog",
      "novorapid",
      "tresiba"
    ],
    "category": "Metabolico / Diabete"
  },
  {
    "brand": "Metformina",
    "ingredient": "Metformina",
    "atc": "A10BA02",
    "aliases": [
      "glucophage",
      "metforal",
      "competen"
    ],
    "category": "Metabolico / Diabete"
  },
  {
    "brand": "Mounjaro",
    "ingredient": "Tirzepatide",
    "atc": "A10BX16",
    "category": "Metabolico / Diabete"
  },
  {
    "brand": "Ozempic",
    "ingredient": "Semaglutide",
    "atc": "A10BJ06",
    "aliases": [
      "wegovy",
      "rybelsus"
    ],
    "category": "Metabolico / Diabete"
  },
  {
    "brand": "Keppra",
    "ingredient": "Levetiracetam",
    "atc": "N03AX14",
    "category": "Neuro / Psichiatria"
  },
  {
    "brand": "Lithium",
    "ingredient": "Carbonato di litio",
    "atc": "N05AN01",
    "aliases": [
      "litio",
      "carbolithium"
    ],
    "category": "Neuro / Psichiatria"
  },
  {
    "brand": "Lyrica",
    "ingredient": "Pregabalin",
    "atc": "N02BF02",
    "aliases": [
      "pregabalin"
    ],
    "category": "Neuro / Psichiatria"
  },
  {
    "brand": "Neurontin",
    "ingredient": "Gabapentin",
    "atc": "N02BF01",
    "aliases": [
      "gabapentin"
    ],
    "category": "Neuro / Psichiatria"
  },
  {
    "brand": "Prozac",
    "ingredient": "Fluoxetina",
    "atc": "N06AB03",
    "aliases": [
      "fluoxetina"
    ],
    "category": "Neuro / Psichiatria"
  },
  {
    "brand": "Seroquel",
    "ingredient": "Quetiapina",
    "atc": "N05AH04",
    "aliases": [
      "quetiapina"
    ],
    "category": "Neuro / Psichiatria"
  },
  {
    "brand": "Tavor",
    "ingredient": "Lorazepam",
    "atc": "N05BA06",
    "aliases": [
      "lorazepam"
    ],
    "category": "Neuro / Psichiatria"
  },
  {
    "brand": "Xanax",
    "ingredient": "Alprazolam",
    "atc": "N05BA12",
    "aliases": [
      "alprazolam"
    ],
    "category": "Neuro / Psichiatria"
  },
  {
    "brand": "Zoloft",
    "ingredient": "Sertralina",
    "atc": "N06AB06",
    "aliases": [
      "sertralina"
    ],
    "category": "Neuro / Psichiatria"
  },
  {
    "brand": "Androgel",
    "ingredient": "Testosterone",
    "atc": "G03BA03",
    "aliases": [
      "testosterone",
      "nebido"
    ],
    "category": "Ormonale / Tiroide"
  },
  {
    "brand": "Cabergolina",
    "ingredient": "Cabergolina",
    "category": "Ormonale / Tiroide",
    "aliases": [
      "dostinex"
    ],
    "defaultDose": "0.25 mg"
  },
  {
    "brand": "Diane",
    "ingredient": "Ciproterone + Etinilestradiolo",
    "atc": "G03HB01",
    "category": "Ormonale / Tiroide"
  },
  {
    "brand": "Estrofem",
    "ingredient": "Estradiolo",
    "atc": "G03CA03",
    "category": "Ormonale / Tiroide"
  },
  {
    "brand": "Euthyrox",
    "ingredient": "Levotiroxina",
    "atc": "H03AA01",
    "category": "Ormonale / Tiroide"
  },
  {
    "brand": "Eutirox",
    "ingredient": "Levotiroxina",
    "atc": "H03AA01",
    "aliases": [
      "levotiroxina",
      "tirosint",
      "synthroid"
    ],
    "category": "Ormonale / Tiroide"
  },
  {
    "brand": "HCG",
    "ingredient": "Gonadotropina corionica umana",
    "category": "Ormonale / Tiroide",
    "aliases": [
      "pregnyl",
      "gonadotropina"
    ],
    "defaultDose": "1000 UI"
  },
  {
    "brand": "HGH",
    "ingredient": "Somatropina",
    "category": "Ormonale / Tiroide",
    "aliases": [
      "growth hormone",
      "genotropin",
      "omnitrope"
    ],
    "defaultDose": "2 UI"
  },
  {
    "brand": "Tirosint",
    "ingredient": "Levotiroxina",
    "atc": "H03AA01",
    "category": "Ormonale / Tiroide"
  },
  {
    "brand": "AOD-9604",
    "ingredient": "AOD-9604",
    "category": "Peptidi",
    "aliases": [],
    "defaultDose": "300 mcg"
  },
  {
    "brand": "BPC-157",
    "ingredient": "Body Protection Compound-157",
    "category": "Peptidi",
    "aliases": [
      "bpc157"
    ],
    "defaultDose": "250 mcg"
  },
  {
    "brand": "CJC-1295",
    "ingredient": "CJC-1295",
    "category": "Peptidi",
    "aliases": [
      "cjc1295"
    ],
    "defaultDose": "100 mcg"
  },
  {
    "brand": "Epithalon",
    "ingredient": "Epitalon",
    "category": "Peptidi",
    "aliases": [
      "epitalon"
    ],
    "defaultDose": "5 mg"
  },
  {
    "brand": "GHRP-2",
    "ingredient": "GHRP-2",
    "category": "Peptidi",
    "aliases": [
      "ghrp2"
    ],
    "defaultDose": "100 mcg"
  },
  {
    "brand": "GHRP-6",
    "ingredient": "GHRP-6",
    "category": "Peptidi",
    "aliases": [
      "ghrp6"
    ],
    "defaultDose": "100 mcg"
  },
  {
    "brand": "Ipamorelin",
    "ingredient": "Ipamorelin",
    "category": "Peptidi",
    "aliases": [],
    "defaultDose": "200 mcg"
  },
  {
    "brand": "Melanotan II",
    "ingredient": "Melanotan II",
    "category": "Peptidi",
    "aliases": [
      "mt2"
    ],
    "defaultDose": "250 mcg"
  },
  {
    "brand": "MK-677",
    "ingredient": "Ibutamoren",
    "category": "Peptidi",
    "aliases": [
      "ibutamoren",
      "nutrobal"
    ],
    "defaultDose": "15 mg"
  },
  {
    "brand": "PT-141",
    "ingredient": "Bremelanotide",
    "category": "Peptidi",
    "aliases": [
      "bremelanotide"
    ],
    "defaultDose": "1 mg"
  },
  {
    "brand": "Selank",
    "ingredient": "Selank",
    "category": "Peptidi",
    "aliases": [],
    "defaultDose": "300 mcg"
  },
  {
    "brand": "Semax",
    "ingredient": "Semax",
    "category": "Peptidi",
    "aliases": [],
    "defaultDose": "300 mcg"
  },
  {
    "brand": "TB-500",
    "ingredient": "Thymosin Beta-4 fragment",
    "category": "Peptidi",
    "aliases": [
      "tb500"
    ],
    "defaultDose": "2 mg"
  },
  {
    "brand": "Tesamorelin",
    "ingredient": "Tesamorelin",
    "category": "Peptidi",
    "aliases": [
      "egrifta"
    ],
    "defaultDose": "1 mg"
  }
];

export function matchDrug(query) {
  const q = foldDrug(query);
  if (!q || q.length < 2) return null;
  let best = null;
  let bestScore = 0;
  for (const row of DRUG_CATALOG) {
    const candidates = [row.brand, row.ingredient, row.category, ...(row.aliases || [])];
    for (const c of candidates) {
      const f = foldDrug(c);
      if (!f) continue;
      let score = 0;
      if (f === q) score = 1;
      else if (f.startsWith(q) && q.length >= 2) score = 0.95;
      else if (q.includes(f) || f.includes(q)) score = 0.92;
      else {
        const qw = q.split(/\s+/).filter((w) => w.length > 2);
        const fw = f.split(/\s+/).filter((w) => w.length > 2);
        if (qw.length && fw.length && qw.every((w) => fw.some((x) => x.startsWith(w) || x.includes(w) || w.includes(x)))) score = 0.8;
      }
      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    }
  }
  if (!best || bestScore < 0.8) return null;
  return {
    brand: best.brand,
    ingredient: best.ingredient,
    active_ingredient: best.ingredient,
    category: best.category || null,
    atc: best.atc || null,
    match_score: bestScore,
    matched_query: query
  };
}

export function enrichTherapyMedications(therapy) {
  if (!therapy) return therapy;
  const meds = therapy.medications || therapy.entries || [];
  meds.forEach((m) => {
    const raw = m.medication || m.name || m.drug || m.principio || m.active_ingredient || '';
    const hit = matchDrug(raw);
    if (hit) {
      m.medication = m.medication || hit.brand;
      m.name = m.name || hit.brand;
      m.brand = hit.brand;
      m.active_ingredient = hit.ingredient;
      m.principio_attivo = hit.ingredient;
      if (hit.category) m.category = m.category || hit.category;
      m.atc = hit.atc;
      m.drug_match_score = hit.match_score;
      m.mappingSource = 'drug_catalog';
    }
  });
  therapy.medications = meds;
  if (meds.length) therapy.present = true;
  return therapy;
}

export default { DRUG_CATALOG, matchDrug, enrichTherapyMedications };

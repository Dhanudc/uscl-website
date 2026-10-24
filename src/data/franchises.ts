export type Franchise = {
  id: string;
  name: string;
  shortName: string;
  city: string;
  image: string;
  accent: string;
  accentSecondary?: string;
};

export const franchises: Franchise[] = [
  {
    id: "arizona-avengers",
    name: "Arizona Avengers",
    shortName: "Avengers",
    city: "Arizona",
    image: "/franchises/arizona-avengers.png",
    accent: "#7a1f2b",
  },
  {
    id: "california-chargers",
    name: "California Chargers",
    shortName: "Chargers",
    city: "California",
    image: "/franchises/california-chargers.png",
    accent: "#d4a017",
  },
  {
    id: "chicago-crushers",
    name: "Chicago Centurions",
    shortName: "Centurions",
    city: "Chicago",
    image: "/franchises/chicago-crushers.jpg",
    accent: "#4aa3d9",
  },
  {
    id: "florida-falcons",
    name: "Florida Falcons",
    shortName: "Falcons",
    city: "Florida",
    image: "/franchises/florida-falcons.png",
    accent: "#e85d04",
  },
  {
    id: "virginia-vikings",
    name: "Virginia Vikings",
    shortName: "Vikings",
    city: "Virginia",
    image: "/franchises/virginia-vikings.png",
    accent: "#16325c",
  },
  {
    id: "new-york-knights",
    name: "Ceipal New York Knights",
    shortName: "Knights",
    city: "New York",
    image: "/franchises/new-york-knights.png",
    accent: "#e85d04",
  },
  {
    id: "texas-thunder",
    name: "Texas Thunders",
    shortName: "Thunders",
    city: "Texas",
    image: "/franchises/texas-thunder.png",
    accent: "#1e4fd6",
  },
  {
    id: "norwin-atlanta-lions",
    name: "Norwin Atlanta Lions",
    shortName: "Lions",
    city: "Atlanta",
    image: "/franchises/norwin-atlanta-lions.png",
    accent: "#e5b820",
    accentSecondary: "#1e4fd6",
  },
];

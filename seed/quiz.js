// seed/quizSeeder.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Quiz = require("../models/quiz");

dotenv.config();

const quizzes = [
  {
    title: "Mathematics - Algebra Basics",
    subject: "Mathematics",
    exam: "JAMB",
    timeLimit: 900,
    questions: [
      {
        question: "What is the value of x in 2x + 5 = 13?",
        options: ["3", "4", "5", "6"],
        correctAnswer: 1,
        explanation: "2x + 5 = 13 → 2x = 8 → x = 4",
      },
      {
        question: "Simplify: 3(x + 2) - 2(x - 1)",
        options: ["x + 8", "x + 4", "5x + 4", "x + 6"],
        correctAnswer: 0,
        explanation: "3(x + 2) - 2(x - 1) = 3x+6 -2x+2 = x+8",
      },
      {
        question: "If y = 2x + 3, find y when x = 5.",
        options: ["11", "13", "15", "17"],
        correctAnswer: 1,
        explanation: "y = 2(5)+3 = 13",
      },
      {
        question: "Factor: x² - 9",
        options: [
          "(x - 3)(x - 3)",
          "(x + 3)(x + 3)",
          "(x - 3)(x + 3)",
          "Cannot be factored",
        ],
        correctAnswer: 2,
        explanation: "Difference of squares → (x - 3)(x + 3)",
      },
      {
        question: "What is the slope of y = 3x - 2?",
        options: ["3", "-2", "1", "5"],
        correctAnswer: 0,
        explanation: "Slope m = 3",
      },
      {
        question: "Expand (x + 2)(x + 3).",
        options: ["x² + 6", "x² + 5x + 6", "x² + 5", "x² + 3x + 2"],
        correctAnswer: 1,
        explanation: "(x+2)(x+3) = x²+3x+2x+6",
      },
      {
        question: "Solve: 5x - 10 = 0",
        options: ["2", "3", "4", "5"],
        correctAnswer: 0,
        explanation: "5x=10 → x=2",
      },
      {
        question: "If f(x)=x², find f(4).",
        options: ["8", "12", "16", "20"],
        correctAnswer: 2,
        explanation: "f(4)=4²=16",
      },
      {
        question: "Find roots of x² - 5x + 6.",
        options: ["2 & 3", "1 & 6", "5 & 6", "2 & 6"],
        correctAnswer: 0,
        explanation: "Factors → (x-2)(x-3)=0",
      },
      {
        question: "Simplify: (x²y)(3x³y²).",
        options: ["3x⁵y³", "3x⁴y³", "3x⁶y²", "x⁵y⁴"],
        correctAnswer: 0,
        explanation: "x²·x³ = x⁵, y·y² = y³ → 3x⁵y³",
      },
    ],
  },
  {
    title: "Physics - Mechanics",
    subject: "Physics",
    exam: "JAMB",
    timeLimit: 900,
    questions: [
      {
        question: "What is the unit of Force?",
        options: ["Joule", "Newton", "Watt", "Pascal"],
        correctAnswer: 1,
        explanation: "SI unit of Force = Newton (N)",
      },
      {
        question: "Speed = ?",
        options: ["Distance/Time", "Force/Area", "Work/Time", "Mass/Volume"],
        correctAnswer: 0,
        explanation: "Speed = Distance ÷ Time",
      },
      {
        question: "Acceleration is rate of change of?",
        options: ["Force", "Velocity", "Speed", "Momentum"],
        correctAnswer: 1,
        explanation: "Acceleration = ΔVelocity / Time",
      },
      {
        question: "1 horsepower ≈ ? watts",
        options: ["746", "1000", "550", "600"],
        correctAnswer: 0,
        explanation: "1 hp ≈ 746 W",
      },
      {
        question: "What is momentum?",
        options: ["mv", "ma", "m/v", "F/t"],
        correctAnswer: 0,
        explanation: "Momentum = mass × velocity",
      },
      {
        question: "Unit of Power?",
        options: ["J/s", "N/m", "kg·m/s²", "Pa"],
        correctAnswer: 0,
        explanation: "Power = Work/Time = Joules per second",
      },
      {
        question: "What is Work?",
        options: ["F × d", "m × v", "F/t", "d/t"],
        correctAnswer: 0,
        explanation: "Work = Force × distance",
      },
      {
        question: "Free fall acceleration on Earth?",
        options: ["9.8 m/s²", "10 m/s²", "8 m/s²", "9.0 m/s²"],
        correctAnswer: 0,
        explanation: "Standard g = 9.8 m/s²",
      },
      {
        question: "A scalar quantity has?",
        options: ["Magnitude only", "Direction only", "Both", "None"],
        correctAnswer: 0,
        explanation: "Scalar = Magnitude only",
      },
      {
        question: "Velocity is?",
        options: [
          "Speed with direction",
          "Force with time",
          "Mass per volume",
          "Distance only",
        ],
        correctAnswer: 0,
        explanation: "Velocity = Speed + Direction",
      },
    ],
  },
  {
    title: "Chemistry - Basics",
    subject: "Chemistry",
    exam: "JAMB",
    timeLimit: 900,
    questions: [
      {
        question: "Atomic number is?",
        options: ["Protons", "Neutrons", "Electrons", "Mass number"],
        correctAnswer: 0,
        explanation: "Atomic number = Protons",
      },
      {
        question: "Water chemical formula?",
        options: ["H₂O", "O₂", "H₂", "HO"],
        correctAnswer: 0,
        explanation: "Water = H₂O",
      },
      {
        question: "NaCl is?",
        options: ["Salt", "Sugar", "Acid", "Base"],
        correctAnswer: 0,
        explanation: "NaCl = Common Salt",
      },
      {
        question: "Acid turns blue litmus?",
        options: ["Red", "Green", "Yellow", "No change"],
        correctAnswer: 0,
        explanation: "Acid → Red litmus",
      },
      {
        question: "pH of neutral solution?",
        options: ["7", "1", "14", "0"],
        correctAnswer: 0,
        explanation: "Neutral pH = 7",
      },
      {
        question: "H₂SO₄ is?",
        options: [
          "Sulfuric acid",
          "Hydrochloric acid",
          "Nitric acid",
          "Carbonic acid",
        ],
        correctAnswer: 0,
        explanation: "H₂SO₄ = Sulfuric acid",
      },
      {
        question: "Avogadro's number?",
        options: ["6.022×10²³", "9.81", "3.14", "1.6×10⁻¹⁹"],
        correctAnswer: 0,
        explanation: "6.022×10²³ particles per mole",
      },
      {
        question: "Symbol for Potassium?",
        options: ["P", "Pt", "K", "Po"],
        correctAnswer: 2,
        explanation: "K = Potassium",
      },
      {
        question: "Gas used in respiration?",
        options: ["O₂", "CO₂", "N₂", "H₂"],
        correctAnswer: 0,
        explanation: "Oxygen needed",
      },
      {
        question: "Noble gases are in group?",
        options: ["18", "1", "7", "2"],
        correctAnswer: 0,
        explanation: "Group 18 = Noble gases",
      },
    ],
  },
  {
    title: "Biology - Cells",
    subject: "Biology",
    exam: "JAMB",
    timeLimit: 900,
    questions: [
      {
        question: "Basic unit of life?",
        options: ["Cell", "Tissue", "Organ", "Organism"],
        correctAnswer: 0,
        explanation: "Cell = Basic unit of life",
      },
      {
        question: "Cell powerhouse?",
        options: ["Nucleus", "Mitochondria", "Chloroplast", "Ribosome"],
        correctAnswer: 1,
        explanation: "Mitochondria → energy",
      },
      {
        question: "Genetic material?",
        options: ["DNA", "RNA", "Protein", "ATP"],
        correctAnswer: 0,
        explanation: "DNA carries genes",
      },
      {
        question: "Cell wall is in?",
        options: ["Plants", "Animals", "Both", "None"],
        correctAnswer: 0,
        explanation: "Plant cells have cell wall",
      },
      {
        question: "Chlorophyll is used in?",
        options: ["Respiration", "Photosynthesis", "Digestion", "Transport"],
        correctAnswer: 1,
        explanation: "Chlorophyll = Photosynthesis",
      },
      {
        question: "Blood transports?",
        options: ["O₂ & Nutrients", "DNA", "Genes", "Sound"],
        correctAnswer: 0,
        explanation: "Blood carries oxygen and nutrients",
      },
      {
        question: "Which organ pumps blood?",
        options: ["Liver", "Lungs", "Heart", "Kidney"],
        correctAnswer: 2,
        explanation: "Heart pumps blood",
      },
      {
        question: "Ribosomes function?",
        options: [
          "Protein synthesis",
          "DNA storage",
          "Energy production",
          "Photosynthesis",
        ],
        correctAnswer: 0,
        explanation: "Ribosomes make proteins",
      },
      {
        question: "Nervous system main unit?",
        options: ["Neuron", "Cell", "Muscle", "Tissue"],
        correctAnswer: 0,
        explanation: "Neuron = unit of nervous system",
      },
      {
        question: "Which tissue connects bones?",
        options: ["Ligament", "Tendon", "Cartilage", "Muscle"],
        correctAnswer: 0,
        explanation: "Ligaments join bones",
      },
    ],
  },
];

const seedQuizzes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected...");

    await Quiz.deleteMany();
    console.log("Old quizzes removed...");

    await Quiz.insertMany(quizzes);
    console.log("Quizzes inserted ✅");

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedQuizzes();

import { iso } from "../lib/date.js";

export const courses = [
  { code: "COSC121", name: "Intro to Computer Science", contact: { lectures: 3, tutorials: 0, labs: 1 }, recommended: 8, logged: 5.5, gradeSoFar: 74, targetGrade: 75 },
  { code: "MATH103", name: "Calculus", contact: { lectures: 4, tutorials: 1, labs: 0 }, recommended: 7, logged: 7.75, gradeSoFar: 68, targetGrade: 72 },
  { code: "ENGL101", name: "Academic Writing", contact: { lectures: 2, tutorials: 1, labs: 0 }, recommended: 5, logged: 4.25, gradeSoFar: 82, targetGrade: 75 },
  { code: "STAT101", name: "Statistics", contact: { lectures: 3, tutorials: 0, labs: 0 }, recommended: 6, logged: 6.5, gradeSoFar: 71, targetGrade: 75 },
];

export const assessments = [
  { id: 1, course: "COSC121", title: "Lab portfolio", type: "Portfolio", dueDate: iso(25), weighting: 20, status: "in progress", progress: 55, estimatedHours: 10 },
  { id: 2, course: "COSC121", title: "Midterm test", type: "Test", dueDate: iso(14), weighting: 25, status: "not started", progress: 12, estimatedHours: 11 },
  { id: 3, course: "COSC121", title: "Assignment 2", type: "Assignment", dueDate: iso(10), weighting: 25, status: "in progress", progress: 40, estimatedHours: 9 },
  { id: 4, course: "COSC121", title: "Final exam", type: "Exam", dueDate: iso(52), weighting: 30, status: "not started", progress: 8, estimatedHours: 18 },
  { id: 5, course: "MATH103", title: "Weekly quizzes", type: "Quiz set", dueDate: iso(6), weighting: 15, status: "in progress", progress: 70, estimatedHours: 4 },
  { id: 6, course: "MATH103", title: "Calculus test", type: "Test", dueDate: iso(15), weighting: 35, status: "not started", progress: 18, estimatedHours: 13 },
  { id: 7, course: "MATH103", title: "Final exam", type: "Exam", dueDate: iso(54), weighting: 50, status: "not started", progress: 6, estimatedHours: 22 },
  { id: 8, course: "ENGL101", title: "Essay 1", type: "Essay", dueDate: iso(-9), weighting: 25, status: "done", progress: 100, estimatedHours: 0, grade: 82 },
  { id: 9, course: "ENGL101", title: "Essay 2", type: "Essay", dueDate: iso(21), weighting: 35, status: "in progress", progress: 28, estimatedHours: 12 },
  { id: 10, course: "ENGL101", title: "Reflective portfolio", type: "Portfolio", dueDate: iso(45), weighting: 40, status: "not started", progress: 5, estimatedHours: 10 },
  { id: 11, course: "STAT101", title: "Assignment 1", type: "Assignment", dueDate: iso(5), weighting: 20, status: "in progress", progress: 60, estimatedHours: 5 },
  { id: 12, course: "STAT101", title: "Project", type: "Project", dueDate: iso(28), weighting: 30, status: "not started", progress: 10, estimatedHours: 14 },
  { id: 13, course: "STAT101", title: "Final exam", type: "Exam", dueDate: iso(53), weighting: 50, status: "not started", progress: 5, estimatedHours: 20 },
];

export const commitments = [
  { id: "gym-mon", day: "Mon", start: 7, end: 8, title: "Gym", type: "gym", protected: true },
  { id: "cosc-mon", day: "Mon", start: 9, end: 10, title: "COSC121 lecture", type: "course", course: "COSC121" },
  { id: "math-mon", day: "Mon", start: 11, end: 12, title: "MATH103 lecture", type: "course", course: "MATH103" },
  { id: "stat-mon", day: "Mon", start: 14, end: 15, title: "STAT101 lecture", type: "course", course: "STAT101" },
  { id: "engl-tue", day: "Tue", start: 10, end: 11, title: "ENGL101 lecture", type: "course", course: "ENGL101" },
  { id: "math-tue", day: "Tue", start: 12, end: 13, title: "MATH103 tutorial", type: "course", course: "MATH103" },
  { id: "work-tue", day: "Tue", start: 17, end: 22, title: "Part-time work", type: "work", protected: true },
  { id: "gym-wed", day: "Wed", start: 7, end: 8, title: "Gym", type: "gym", protected: true },
  { id: "cosc-wed", day: "Wed", start: 9, end: 10, title: "COSC121 lab", type: "course", course: "COSC121" },
  { id: "math-wed", day: "Wed", start: 11, end: 12, title: "MATH103 lecture", type: "course", course: "MATH103" },
  { id: "engl-wed", day: "Wed", start: 13, end: 14, title: "ENGL101 tutorial", type: "course", course: "ENGL101" },
  { id: "stat-thu", day: "Thu", start: 9, end: 10, title: "STAT101 lecture", type: "course", course: "STAT101" },
  { id: "cosc-thu", day: "Thu", start: 12, end: 13, title: "COSC121 lecture", type: "course", course: "COSC121" },
  { id: "work-thu", day: "Thu", start: 17, end: 22, title: "Part-time work", type: "work", protected: true },
  { id: "gym-fri", day: "Fri", start: 7, end: 8, title: "Gym", type: "gym", protected: true },
  { id: "math-fri", day: "Fri", start: 10, end: 11, title: "MATH103 lecture", type: "course", course: "MATH103" },
  { id: "stat-fri", day: "Fri", start: 11, end: 12, title: "STAT101 lecture", type: "course", course: "STAT101" },
  { id: "engl-fri", day: "Fri", start: 15, end: 16, title: "ENGL101 lecture", type: "course", course: "ENGL101" },
  { id: "work-sat", day: "Sat", start: 10, end: 16, title: "Part-time work", type: "work", protected: true },
  { id: "social-sat", day: "Sat", start: 19, end: 22, title: "Dinner with friends", type: "social", protected: true },
  { id: "reset-sun", day: "Sun", start: 10, end: 12, title: "Laundry + reset", type: "life" },
];

export const taskHistory = {
  3: { assessmentId: 3, rescheduled: 2, skipped: 0, completedBlocks: 1 },
  5: { assessmentId: 5, rescheduled: 1, skipped: 1, completedBlocks: 2 },
  9: { assessmentId: 9, rescheduled: 3, skipped: 0, completedBlocks: 0 },
};

export const studySessions = [
  { id: "s1", course: "COSC121", minutes: 55, date: iso(-2), assessmentId: 3 },
  { id: "s2", course: "STAT101", minutes: 75, date: iso(-1), assessmentId: 11 },
];

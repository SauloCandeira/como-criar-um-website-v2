interface TimelineItem {
  id: number;
  title: string;
  start: string;
  end: string;
  status: "active" | "completed";
  progress: number;
}

import { Badge } from "@/components/ui/badge";

interface EventCardProps {
  title: string;
  organization: string;
  date: string;
  location: string;
  category: string;
  image: string;
  categoryColor: string;
}

const EventCard = ({ title, organization, date, location, category, image, categoryColor }: EventCardProps) => {
  return (
    <div className="group overflow-hidden cursor-pointer bg-card">
      <div className="relative h-64 overflow-hidden rounded-2xl">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-6 left-6">
          <h3 className="text-white font-bold text-3xl uppercase tracking-tight">{title}</h3>
        </div>
      </div>
      <div className="pt-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-sm text-muted-foreground">{location}</p>
          <Badge className={`${categoryColor} border-0 rounded-full px-3`}>{category}</Badge>
        </div>
        <h4 className="text-lg font-bold text-foreground mb-1">{organization}</h4>
        <p className="text-sm text-muted-foreground">{date}</p>
      </div>
    </div>
  );
};

export default EventCard;

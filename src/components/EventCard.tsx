import { Star } from "lucide-react";

interface EventCardProps {
  title: string;
  shortTitle: string;
  organization: string;
  date: string;
  location: string;
  image: string;
  isNew?: boolean;
}

const EventCard = ({ title, shortTitle, organization, date, location, image, isNew = false }: EventCardProps) => {
  const titleWords = shortTitle.split(" ");
  
  return (
    <div className="group overflow-hidden cursor-pointer">
      <div className="relative h-64 overflow-hidden rounded-lg">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-6 left-6">
          <div className="text-white font-extrabold text-2xl uppercase leading-tight">
            {titleWords.map((word, index) => (
              <div key={index}>{word}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="pt-4 space-y-1">
        <div className="flex items-start justify-between">
          <p className="text-sm text-muted-foreground">{location}</p>
          {isNew && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-foreground" />
              <span className="text-sm font-semibold text-foreground">Nouveau</span>
            </div>
          )}
        </div>
        <h4 className="text-lg font-bold text-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground">{date}</p>
        <p className="text-sm text-muted-foreground">Organisé par {organization}</p>
      </div>
    </div>
  );
};

export default EventCard;

import { Star, Heart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface EventCardProps {
  id?: string;
  title: string;
  shortTitle: string;
  organization: string;
  date: string;
  location: string;
  image: string;
  isNew?: boolean;
}

const EventCard = ({ id, title, shortTitle, organization, date, location, image, isNew = false }: EventCardProps) => {
  const titleWords = shortTitle.split(" ");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const isLiked = id ? isFavorite(id) : false;

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!id) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }
    
    await toggleFavorite(id);
  };
  
  const CardContent = (
    <>
      <div className="relative h-64 overflow-hidden rounded-lg">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <button
          onClick={handleLikeClick}
          className={cn(
            "absolute top-4 right-4 transition-opacity duration-300 p-2 rounded-full bg-background/80 hover:bg-background",
            isLiked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <Heart className={cn(
            "w-5 h-5",
            isLiked ? "fill-destructive text-destructive" : "text-foreground"
          )} />
        </button>
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
        <p className="text-sm text-muted-foreground">
          Organisé par{" "}
          <span className="text-foreground font-semibold underline hover:opacity-80 transition-opacity">
            {organization}
          </span>
        </p>
      </div>
    </>
  );

  if (id) {
    return (
      <Link to={`/events/${id}`} className="group overflow-hidden cursor-pointer block">
        {CardContent}
      </Link>
    );
  }
  
  return (
    <div className="group overflow-hidden cursor-pointer">
      {CardContent}
    </div>
  );
};

export default EventCard;

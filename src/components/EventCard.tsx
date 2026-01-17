import React from "react";
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
  organizationId?: string;
  date: string;
  location: string;
  image: string;
  isNew?: boolean;
}

const EventCardComponent = ({ id, title, shortTitle, organization, organizationId, date, location, image, isNew = false }: EventCardProps) => {
  const words = shortTitle.split(" ");
  // Split into max 2 lines
  const lines: string[] = [];
  if (words.length <= 2) {
    lines.push(...words);
  } else {
    const midpoint = Math.ceil(words.length / 2);
    lines.push(words.slice(0, midpoint).join(" "));
    lines.push(words.slice(midpoint).join(" "));
  }
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
  
  const CardImage = (
    <div className="relative h-64 overflow-hidden rounded-lg">
      <img
        src={image}
        alt={title}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute bottom-6 left-6">
        <div className="text-white font-extrabold text-2xl uppercase leading-tight">
          {lines.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  );

  const CardInfo = (
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
      <h4 className="text-lg font-bold text-foreground truncate">{title}</h4>
      <p className="text-sm text-muted-foreground">{date}</p>
      {!id && (
        <p className="text-sm text-muted-foreground">
          Organisé par{" "}
          {organizationId ? (
            <Link
              to={`/organization/${organizationId}`}
              className="text-foreground font-semibold underline hover:opacity-80 transition-opacity"
            >
              {organization}
            </Link>
          ) : (
            <span className="text-foreground font-semibold">
              {organization}
            </span>
          )}
        </p>
      )}
    </div>
  );

  const OrganizationLink = id && organizationId ? (
    <div className="pt-2">
      <p className="text-sm text-muted-foreground">
        Organisé par{" "}
        <Link
          to={`/organization/${organizationId}`}
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="text-foreground font-semibold underline hover:opacity-80 transition-opacity"
        >
          {organization}
        </Link>
      </p>
    </div>
  ) : null;

  return (
    <div className="group overflow-hidden cursor-pointer relative">
      {/* Like button - positioned absolutely over the card */}
      <button
        onClick={handleLikeClick}
        className={cn(
          "absolute top-4 right-4 z-10 transition-opacity duration-300 p-2 rounded-full bg-background/80 hover:bg-background",
          isLiked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <Heart className={cn(
          "w-5 h-5",
          isLiked ? "fill-destructive text-destructive" : "text-foreground"
        )} />
      </button>

      {id ? (
        <>
          <Link to={`/events/${id}`} className="block">
            {CardImage}
            {CardInfo}
          </Link>
          {OrganizationLink}
        </>
      ) : (
        <>
          {CardImage}
          {CardInfo}
        </>
      )}
    </div>
  );
};

// Mémoriser le composant pour éviter les re-renders inutiles
// Comparaison personnalisée basée sur les props qui affectent l'affichage
const EventCard = React.memo(EventCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.title === nextProps.title &&
    prevProps.shortTitle === nextProps.shortTitle &&
    prevProps.organization === nextProps.organization &&
    prevProps.organizationId === nextProps.organizationId &&
    prevProps.date === nextProps.date &&
    prevProps.location === nextProps.location &&
    prevProps.image === nextProps.image &&
    prevProps.isNew === nextProps.isNew
  );
});

EventCard.displayName = 'EventCard';

export default EventCard;

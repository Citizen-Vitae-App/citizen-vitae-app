import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { useState, useMemo, useEffect } from 'react';
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, Link as LinkIcon, List, ListOrdered, Type, Smile, Search, Clock, SmilePlus, Heart, ThumbsUp, Leaf, Utensils, Plane, Activity, Hash } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Emoji data with searchable keywords
const EMOJI_DATA: { emoji: string; keywords: string[] }[] = [
  // Smileys
  { emoji: '😀', keywords: ['sourire', 'smile', 'happy', 'heureux', 'joie'] },
  { emoji: '😃', keywords: ['sourire', 'smile', 'happy', 'heureux', 'grand'] },
  { emoji: '😄', keywords: ['sourire', 'smile', 'happy', 'content', 'rire'] },
  { emoji: '😁', keywords: ['sourire', 'smile', 'grin', 'content'] },
  { emoji: '😅', keywords: ['sourire', 'sueur', 'sweat', 'nerveux'] },
  { emoji: '😂', keywords: ['rire', 'laugh', 'larmes', 'tears', 'mdr', 'lol'] },
  { emoji: '🤣', keywords: ['rire', 'laugh', 'rofl', 'mdr', 'ptdr'] },
  { emoji: '😊', keywords: ['sourire', 'smile', 'heureux', 'content', 'blush'] },
  { emoji: '😇', keywords: ['ange', 'angel', 'innocent', 'halo'] },
  { emoji: '🙂', keywords: ['sourire', 'smile', 'léger'] },
  { emoji: '😉', keywords: ['clin', 'wink', 'complice'] },
  { emoji: '😍', keywords: ['amour', 'love', 'coeur', 'heart', 'yeux'] },
  { emoji: '🥰', keywords: ['amour', 'love', 'coeurs', 'hearts', 'affection'] },
  { emoji: '😘', keywords: ['bisou', 'kiss', 'amour', 'love'] },
  { emoji: '😋', keywords: ['miam', 'yummy', 'délicieux', 'langue'] },
  { emoji: '😎', keywords: ['cool', 'lunettes', 'sunglasses', 'classe'] },
  { emoji: '🤗', keywords: ['câlin', 'hug', 'accueil', 'bienvenue'] },
  { emoji: '🤔', keywords: ['réfléchir', 'think', 'hmm', 'question'] },
  { emoji: '😐', keywords: ['neutre', 'neutral', 'indifférent'] },
  { emoji: '😑', keywords: ['ennui', 'bored', 'blasé'] },
  { emoji: '🙄', keywords: ['yeux', 'eyes', 'roll', 'exaspéré'] },
  { emoji: '😏', keywords: ['smirk', 'malicieux', 'narquois'] },
  { emoji: '😴', keywords: ['dormir', 'sleep', 'fatigué', 'tired', 'zzz'] },
  { emoji: '🙃', keywords: ['envers', 'upside', 'sarcastique'] },
  // Gestures
  { emoji: '👍', keywords: ['pouce', 'thumb', 'ok', 'bien', 'top', 'like', 'super'] },
  { emoji: '👎', keywords: ['pouce', 'thumb', 'down', 'non', 'dislike', 'nul'] },
  { emoji: '👏', keywords: ['applaudir', 'clap', 'bravo', 'félicitations'] },
  { emoji: '🙌', keywords: ['mains', 'hands', 'célébrer', 'victoire', 'hourra'] },
  { emoji: '🤝', keywords: ['poignée', 'handshake', 'accord', 'deal'] },
  { emoji: '💪', keywords: ['muscle', 'fort', 'strong', 'force', 'biceps'] },
  { emoji: '✌️', keywords: ['victoire', 'victory', 'paix', 'peace', 'deux'] },
  { emoji: '🤞', keywords: ['croiser', 'cross', 'chance', 'luck', 'doigts'] },
  { emoji: '👋', keywords: ['salut', 'wave', 'coucou', 'hello', 'bye'] },
  { emoji: '🙏', keywords: ['prier', 'pray', 'merci', 'thanks', 'svp', 'please'] },
  // Hearts
  { emoji: '❤️', keywords: ['coeur', 'heart', 'amour', 'love', 'rouge', 'red'] },
  { emoji: '🧡', keywords: ['coeur', 'heart', 'orange'] },
  { emoji: '💛', keywords: ['coeur', 'heart', 'jaune', 'yellow'] },
  { emoji: '💚', keywords: ['coeur', 'heart', 'vert', 'green'] },
  { emoji: '💙', keywords: ['coeur', 'heart', 'bleu', 'blue'] },
  { emoji: '💜', keywords: ['coeur', 'heart', 'violet', 'purple'] },
  { emoji: '🖤', keywords: ['coeur', 'heart', 'noir', 'black'] },
  { emoji: '🤍', keywords: ['coeur', 'heart', 'blanc', 'white'] },
  { emoji: '💔', keywords: ['coeur', 'heart', 'brisé', 'broken', 'triste'] },
  // Nature
  { emoji: '🌸', keywords: ['fleur', 'flower', 'cerisier', 'cherry', 'rose', 'pink'] },
  { emoji: '🌹', keywords: ['rose', 'fleur', 'flower', 'amour', 'love'] },
  { emoji: '🌻', keywords: ['tournesol', 'sunflower', 'jaune', 'soleil'] },
  { emoji: '☀️', keywords: ['soleil', 'sun', 'été', 'summer', 'chaud'] },
  { emoji: '🌙', keywords: ['lune', 'moon', 'nuit', 'night'] },
  { emoji: '⭐', keywords: ['étoile', 'star', 'favori', 'favorite'] },
  { emoji: '✨', keywords: ['étincelles', 'sparkles', 'magie', 'magic', 'briller'] },
  { emoji: '🔥', keywords: ['feu', 'fire', 'chaud', 'hot', 'tendance', 'lit'] },
  { emoji: '🌈', keywords: ['arc-en-ciel', 'rainbow', 'couleurs', 'colors'] },
  { emoji: '🌊', keywords: ['vague', 'wave', 'mer', 'sea', 'océan', 'ocean'] },
  // Food
  { emoji: '🍎', keywords: ['pomme', 'apple', 'rouge', 'fruit'] },
  { emoji: '🍕', keywords: ['pizza', 'italien', 'italian', 'manger'] },
  { emoji: '🍔', keywords: ['burger', 'hamburger', 'fast-food', 'manger'] },
  { emoji: '☕', keywords: ['café', 'coffee', 'tasse', 'cup', 'matin'] },
  { emoji: '🍺', keywords: ['bière', 'beer', 'alcool', 'bar'] },
  { emoji: '🍷', keywords: ['vin', 'wine', 'rouge', 'alcool'] },
  // Symbols
  { emoji: '✅', keywords: ['check', 'ok', 'validé', 'done', 'fait', 'oui', 'yes'] },
  { emoji: '❌', keywords: ['croix', 'cross', 'non', 'no', 'erreur', 'faux'] },
  { emoji: '⚠️', keywords: ['attention', 'warning', 'danger', 'alerte'] },
  { emoji: '📌', keywords: ['épingle', 'pin', 'punaise', 'marquer'] },
  { emoji: '🔔', keywords: ['cloche', 'bell', 'notification', 'alerte'] },
  { emoji: '💬', keywords: ['bulle', 'chat', 'message', 'parler', 'commentaire'] },
  { emoji: '🎉', keywords: ['fête', 'party', 'célébration', 'confetti', 'bravo'] },
  { emoji: '🎊', keywords: ['fête', 'party', 'célébration', 'confetti'] },
  { emoji: '🎁', keywords: ['cadeau', 'gift', 'présent', 'anniversaire'] },
  { emoji: '🏆', keywords: ['trophée', 'trophy', 'gagner', 'winner', 'champion'] },
  { emoji: '💡', keywords: ['ampoule', 'idea', 'idée', 'lumière', 'light'] },
  { emoji: '💰', keywords: ['argent', 'money', 'sac', 'riche', 'dollar'] },
  { emoji: '💎', keywords: ['diamant', 'diamond', 'bijou', 'précieux'] },
  { emoji: '⏰', keywords: ['réveil', 'alarm', 'heure', 'time', 'horloge'] },
  { emoji: '📅', keywords: ['calendrier', 'calendar', 'date', 'rendez-vous'] },
];

const EMOJI_CATEGORIES = {
  smileys: {
    name: 'Smileys',
    icon: SmilePlus,
    emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😋', '😎', '🤗', '🤔', '😐', '😑', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃']
  },
  gestures: {
    name: 'Gestes',
    icon: ThumbsUp,
    emojis: ['👍', '👎', '👏', '🙌', '🤝', '💪', '✌️', '🤞', '🤟', '🤘', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✊', '👊', '🤛', '🤜', '👆', '👇', '👈', '👉', '🙏']
  },
  hearts: {
    name: 'Cœurs',
    icon: Heart,
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟']
  },
  nature: {
    name: 'Nature',
    icon: Leaf,
    emojis: ['🌸', '💐', '🌷', '🌹', '🥀', '🌺', '🌻', '🌼', '🌿', '🍀', '🍁', '🍂', '🌲', '🌳', '🌴', '🌵', '🌾', '🌱', '☀️', '🌙', '⭐', '🌟', '✨', '⚡', '🔥', '🌈', '☁️', '❄️', '💧', '🌊']
  },
  food: {
    name: 'Nourriture',
    icon: Utensils,
    emojis: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🌽', '🥕', '🧄', '🧅', '🥔', '🍞', '🥐', '🧀', '🍕', '🍔']
  },
  travel: {
    name: 'Voyage',
    icon: Plane,
    emojis: ['🚗', '🚕', '🚌', '🚎', '🚐', '🚑', '🚒', '🚓', '✈️', '🚀', '🛸', '🚁', '⛵', '🚢', '🏠', '🏡', '🏢', '🏰', '🗼', '🗽', '🗿', '⛺', '🎡', '🎢', '🎠', '⛱️', '🏖️', '🏝️', '🏔️', '🌋']
  },
  activities: {
    name: 'Activités',
    icon: Activity,
    emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🎿', '⛷️', '🏂', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎸', '🎺', '🎻', '🎲', '♟️', '🎯']
  },
  symbols: {
    name: 'Symboles',
    icon: Hash,
    emojis: ['✅', '❌', '⚠️', '📌', '📍', '🔔', '💬', '💭', '🗨️', '📢', '💡', '💫', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🎖️', '🏅', '📊', '📈', '📉', '💰', '💎', '⏰', '📅', '✏️']
  }
};

const FREQUENT_STORAGE_KEY = 'emoji-frequently-used';
const MAX_FREQUENT = 16;

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const [showToolbar, setShowToolbar] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [isEmojiPopoverOpen, setIsEmojiPopoverOpen] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [frequentEmojis, setFrequentEmojis] = useState<string[]>([]);

  // Load frequent emojis from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(FREQUENT_STORAGE_KEY);
    if (stored) {
      try {
        setFrequentEmojis(JSON.parse(stored));
      } catch {
        setFrequentEmojis([]);
      }
    }
  }, []);

  // Filter emojis based on search using keywords
  const filteredEmojis = useMemo(() => {
    if (!emojiSearch) return null;
    const searchLower = emojiSearch.toLowerCase();
    return EMOJI_DATA
      .filter(item => item.keywords.some(keyword => keyword.includes(searchLower)))
      .map(item => item.emoji);
  }, [emojiSearch]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc pl-4',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal pl-4',
          },
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[80px] px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html === '<p></p>' ? '' : html);
    },
  });

  const addLink = () => {
    if (linkUrl && editor) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setIsLinkPopoverOpen(false);
    }
  };

  const removeLink = () => {
    if (editor) {
      editor.chain().focus().unsetLink().run();
      setIsLinkPopoverOpen(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    if (editor) {
      editor.chain().focus().insertContent(emoji).run();
      
      // Update frequent emojis
      const newFrequent = [emoji, ...frequentEmojis.filter(e => e !== emoji)].slice(0, MAX_FREQUENT);
      setFrequentEmojis(newFrequent);
      localStorage.setItem(FREQUENT_STORAGE_KEY, JSON.stringify(newFrequent));
    }
  };

  const categoryKeys = Object.keys(EMOJI_CATEGORIES) as (keyof typeof EMOJI_CATEGORIES)[];

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('bg-black/[0.03] hover:bg-black/[0.05] rounded-md transition-colors', className)}>
      {/* Toolbar - visible when toggled */}
      {showToolbar && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border/30">
          <Toggle
            size="sm"
            pressed={editor.isActive('bold')}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            aria-label="Gras"
            className="h-8 w-8 p-0 data-[state=on]:bg-black/10"
          >
            <Bold className="h-4 w-4" />
          </Toggle>
          
          <Toggle
            size="sm"
            pressed={editor.isActive('italic')}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            aria-label="Italique"
            className="h-8 w-8 p-0 data-[state=on]:bg-black/10"
          >
            <Italic className="h-4 w-4" />
          </Toggle>
          
          <Toggle
            size="sm"
            pressed={editor.isActive('underline')}
            onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
            aria-label="Souligné"
            className="h-8 w-8 p-0 data-[state=on]:bg-black/10"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Toggle>
          
          <Toggle
            size="sm"
            pressed={editor.isActive('strike')}
            onPressedChange={() => editor.chain().focus().toggleStrike().run()}
            aria-label="Barré"
            className="h-8 w-8 p-0 data-[state=on]:bg-black/10"
          >
            <Strikethrough className="h-4 w-4" />
          </Toggle>

          <div className="w-px h-5 bg-border/50 mx-1" />
          
          <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
            <PopoverTrigger asChild>
              <Toggle
                size="sm"
                pressed={editor.isActive('link')}
                aria-label="Lien"
                className="h-8 w-8 p-0 data-[state=on]:bg-black/10"
              >
                <LinkIcon className="h-4 w-4" />
              </Toggle>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <div className="space-y-2">
                <Input
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLink();
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={addLink} className="flex-1">
                    Ajouter
                  </Button>
                  {editor.isActive('link') && (
                    <Button size="sm" variant="outline" onClick={removeLink}>
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Toggle
            size="sm"
            pressed={editor.isActive('orderedList')}
            onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
            aria-label="Liste numérotée"
            className="h-8 w-8 p-0 data-[state=on]:bg-black/10"
          >
            <ListOrdered className="h-4 w-4" />
          </Toggle>
          
          <Toggle
            size="sm"
            pressed={editor.isActive('bulletList')}
            onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
            aria-label="Liste à puces"
            className="h-8 w-8 p-0 data-[state=on]:bg-black/10"
          >
            <List className="h-4 w-4" />
          </Toggle>
        </div>
      )}

      {/* Editor content */}
      <div className="relative">
        <EditorContent editor={editor} />
        {editor.isEmpty && placeholder && (
          <p className="absolute top-3 left-4 text-muted-foreground pointer-events-none">
            {placeholder}
          </p>
        )}
      </div>

      {/* Bottom bar with Aa button and Emoji button */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-border/30">
        <button
          type="button"
          onClick={() => setShowToolbar(!showToolbar)}
          className={cn(
            "flex items-center justify-center h-8 w-8 rounded hover:bg-black/10 transition-colors",
            showToolbar && "bg-black/10"
          )}
          title="Afficher les options de mise en forme"
        >
          <Type className="h-4 w-4 text-muted-foreground" />
        </button>

        <Popover open={isEmojiPopoverOpen} onOpenChange={(open) => {
          setIsEmojiPopoverOpen(open);
          if (!open) {
            setEmojiSearch('');
            setActiveCategory(null);
          }
        }}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded hover:bg-black/10 transition-colors",
                isEmojiPopoverOpen && "bg-black/10"
              )}
              title="Insérer un emoji"
            >
              <Smile className="h-4 w-4 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            {/* Category tabs */}
            <div className="flex items-center gap-0.5 p-2 border-b border-border/30 overflow-x-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveCategory(null);
                  setEmojiSearch('');
                }}
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded hover:bg-black/10 transition-colors flex-shrink-0",
                  activeCategory === null && !emojiSearch && "bg-black/10"
                )}
                title="Rechercher"
              >
                <Search className="h-4 w-4 text-muted-foreground" />
              </button>
              {categoryKeys.map((key) => {
                const category = EMOJI_CATEGORIES[key];
                const Icon = category.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setActiveCategory(key);
                      setEmojiSearch('');
                    }}
                    className={cn(
                      "flex items-center justify-center h-8 w-8 rounded hover:bg-black/10 transition-colors flex-shrink-0",
                      activeCategory === key && "bg-black/10"
                    )}
                    title={category.name}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>

            {/* Search input */}
            {activeCategory === null && (
              <div className="p-2 border-b border-border/30">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher parmi tous les émojis"
                    value={emojiSearch}
                    onChange={(e) => setEmojiSearch(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>
            )}

            <ScrollArea className="h-52">
              <div className="p-2">
                {/* Search results */}
                {emojiSearch && filteredEmojis && (
                  <div className="grid grid-cols-8 gap-1">
                    {filteredEmojis.map((emoji, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          insertEmoji(emoji);
                          setIsEmojiPopoverOpen(false);
                        }}
                        className="h-8 w-8 flex items-center justify-center hover:bg-black/10 rounded transition-colors text-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Frequent emojis (only when no search and no category) */}
                {!emojiSearch && !activeCategory && frequentEmojis.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Fréquemment utilisés</span>
                    </div>
                    <div className="grid grid-cols-8 gap-1">
                      {frequentEmojis.map((emoji, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            insertEmoji(emoji);
                            setIsEmojiPopoverOpen(false);
                          }}
                          className="h-8 w-8 flex items-center justify-center hover:bg-black/10 rounded transition-colors text-lg"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category content */}
                {!emojiSearch && activeCategory && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      {(() => {
                        const Icon = EMOJI_CATEGORIES[activeCategory].icon;
                        return <Icon className="h-3.5 w-3.5 text-muted-foreground" />;
                      })()}
                      <span className="text-xs font-medium text-muted-foreground">{EMOJI_CATEGORIES[activeCategory].name}</span>
                    </div>
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            insertEmoji(emoji);
                            setIsEmojiPopoverOpen(false);
                          }}
                          className="h-8 w-8 flex items-center justify-center hover:bg-black/10 rounded transition-colors text-lg"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* All categories (when no search, no active category, after frequent) */}
                {!emojiSearch && !activeCategory && categoryKeys.map((key) => {
                  const category = EMOJI_CATEGORIES[key];
                  const Icon = category.icon;
                  return (
                    <div key={key} className="mb-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">{category.name}</span>
                      </div>
                      <div className="grid grid-cols-8 gap-1">
                        {category.emojis.slice(0, 16).map((emoji, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              insertEmoji(emoji);
                              setIsEmojiPopoverOpen(false);
                            }}
                            className="h-8 w-8 flex items-center justify-center hover:bg-black/10 rounded transition-colors text-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { useState } from 'react';
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, Link as LinkIcon, List, ListOrdered, Type, Smile } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
  '😉', '😍', '🥰', '😘', '😋', '😎', '🤗', '🤔', '😐', '😑',
  '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '😴',
  '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃',
  '👍', '👎', '👏', '🙌', '🤝', '💪', '✌️', '🤞', '🤟', '🤘',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️',
  '✨', '🌟', '⭐', '🔥', '💥', '💫', '🎉', '🎊', '🎈', '🎁',
  '✅', '❌', '⚠️', '📌', '📍', '🔔', '💬', '💭', '🗨️', '📢',
];

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const [showToolbar, setShowToolbar] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [isEmojiPopoverOpen, setIsEmojiPopoverOpen] = useState(false);

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
    }
  };

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

        <Popover open={isEmojiPopoverOpen} onOpenChange={setIsEmojiPopoverOpen}>
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
          <PopoverContent className="w-72 p-2" align="start">
            <div className="grid grid-cols-10 gap-1">
              {EMOJI_LIST.map((emoji, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    insertEmoji(emoji);
                    setIsEmojiPopoverOpen(false);
                  }}
                  className="h-7 w-7 flex items-center justify-center hover:bg-black/10 rounded transition-colors text-base"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

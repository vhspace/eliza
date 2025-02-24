import type { Character } from "@elizaos/core";
import { useState, type FormEvent } from "react";
import ArrayInput from "@/components/array-input";
import InputCopy from "@/components/input-copy";
import PageTitle from "./page-title";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

type NestedObject = {
  [key: string]: string | number | boolean | NestedObject;
};

type UpdateArrayPath = 
  | "bio" 
  | "topics" 
  | "adjectives" 
  | "plugins" 
  | "style.all" 
  | "style.chat" 
  | "style.post";

type InputField = {
  title: string;
  name: string;
  getValue: (char: Character) => string;
};

type ArrayField = {
  title: string;
  path: UpdateArrayPath;
  getData: (char: Character) => string[];
};

type CheckboxField = {
  name: string;
  label: string;
  getValue: (char: Character) => boolean;
};

const TEXT_FIELDS: InputField[] = [
  {
    title: "Name",
    name: "name",
    getValue: (char) => char.name || '',
  },
  {
    title: "Username",
    name: "username",
    getValue: (char) => char.username || '',
  },
  {
    title: "System",
    name: "system",
    getValue: (char) => char.system || '',
  },
  {
    title: "Voice Model",
    name: "settings.voice.model",
    getValue: (char) => char.settings?.voice?.model || '',
  },
];

const ARRAY_FIELDS: ArrayField[] = [
  {
    title: "Bio",
    path: "bio",
    getData: (char) => Array.isArray(char.bio) ? char.bio : [],
  },
  {
    title: "Topics",
    path: "topics",
    getData: (char) => char.topics || [],
  },
  {
    title: "Adjectives",
    path: "adjectives",
    getData: (char) => char.adjectives || [],
  },
  {
    title: "Plugins",
    path: "plugins",
    getData: (char) => Array.isArray(char.plugins) ? char.plugins : [],
  },
];

const STYLE_FIELDS: ArrayField[] = [
  {
    title: "All",
    path: "style.all",
    getData: (char) => char.style?.all || [],
  },
  {
    title: "Chat",
    path: "style.chat",
    getData: (char) => char.style?.chat || [],
  },
  {
    title: "Post",
    path: "style.post",
    getData: (char) => char.style?.post || [],
  },
];

const TWITTER_CHECKBOXES: CheckboxField[] = [
  {
    name: "settings.TWITTER_POST_IMMEDIATELY",
    label: "Post Immediately",
    getValue: (char) => char.settings?.TWITTER_POST_IMMEDIATELY || false,
  },
  {
    name: "settings.TWITTER_ENABLE_POST_GENERATION",
    label: "Enable Post Generation",
    getValue: (char) => char.settings?.TWITTER_ENABLE_POST_GENERATION || false,
  },
];

export default function Overview({ character }: { character: Character }) {
  const { toast } = useToast();
  const [characterValue, setCharacterValue] = useState<Character>(character);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const parts = name.split('.');
      setCharacterValue(prev => {
        const newValue = { ...prev };
        let current = newValue as unknown as NestedObject;
        
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) {
            current[parts[i]] = {};
          }
          current = current[parts[i]] as NestedObject;
        }
        
        current[parts[parts.length - 1]] = type === 'checkbox' ? checked : value;
        return newValue;
      });
    } else {
      setCharacterValue(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const updateArray = (path: UpdateArrayPath, newData: string[]) => {
    setCharacterValue(prev => {
      const newValue = { ...prev };
      
      if (path.includes('.')) {
        const [parent, child] = path.split('.') as ["style", "all" | "chat" | "post"];
        return {
          ...newValue,
          [parent]: {
            ...(newValue[parent] || {}),
            [child]: newData
          }
        };
      }
      
      return {
        ...newValue,
        [path]: newData
      } as Character;
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Success",
        description: "Character updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update character",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <PageTitle
        title="Overview"
        subtitle="An overview of your selected AI Agent."
      />

      <form onSubmit={handleSubmit} className="space-y-4 mt-5">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            {TEXT_FIELDS.map((field) => (
              <InputCopy
                key={field.name}
                title={field.title}
                name={field.name}
                value={field.getValue(characterValue)}
                onChange={handleChange}
              />
            ))}
          </TabsContent>

          <TabsContent value="content" className="space-y-4 mt-4">
            {ARRAY_FIELDS.slice(0, 3).map((field) => (
              <div key={field.path} className="space-y-2">
                <ArrayInput
                  title={field.title}
                  data={field.getData(characterValue)}
                  onChange={(newData) => updateArray(field.path, newData)}
                />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="style" className="space-y-4 mt-4">
            <div className="space-y-4">
              {STYLE_FIELDS.map((field) => (
                <ArrayInput
                  key={field.path}
                  title={field.title}
                  data={field.getData(characterValue)}
                  onChange={(newData) => updateArray(field.path, newData)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <ArrayInput
                  title="Plugins"
                  data={ARRAY_FIELDS[3].getData(characterValue)}
                  onChange={(newData) => updateArray(ARRAY_FIELDS[3].path, newData)}
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Twitter Settings</h3>
                <div className="space-y-2">
                  {TWITTER_CHECKBOXES.map((field) => (
                    <label key={field.name} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name={field.name}
                        checked={field.getValue(characterValue)}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-4 mt-8">
          <Button
            type="submit"
            disabled={isSubmitting}
            variant="default"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setCharacterValue(character)}
          >
            Reset Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

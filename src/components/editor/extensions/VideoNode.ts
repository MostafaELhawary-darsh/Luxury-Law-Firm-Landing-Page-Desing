import { Node, mergeAttributes } from '@tiptap/core';

export interface VideoNodeAttrs {
  src: string;
  width: number;
  height: number;
}

const VideoNode = Node.create({
  name: 'video',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      width: {
        default: 500,
      },
      height: {
        default: 280,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'video',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'video',
      mergeAttributes(HTMLAttributes, {
        controls: true,
        style: 'max-width: 100%; border-radius: 0.5rem; margin: 1rem 0;',
      }),
    ];
  },

  addCommands() {
    return {
      setVideo: (options: VideoNodeAttrs) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },
});

export { VideoNode };

# attachments

Drop images / media here to reference from cards.

## Pattern

One subfolder per card, named after the card `id`:

```
public/attachments/
  vesper-deploy/
    hetzner-console.png
    tailnet-diagram.svg
  koda-bootstrap-bump/
    before-after.png
```

Then reference in the card body:

```markdown
![Hetzner console showing the CAX21 provisioned](/attachments/vesper-deploy/hetzner-console.png)
```

## Supported

Any format a browser can render inline: PNG, JPG, WebP, SVG, GIF, MP4, WebM.

## Styling

Images inside card bodies get:
- Max width: 100% of card
- Rounded corners (4px)
- Subtle foxfire-glow border on hover
- Respect for the foxfire palette

## Phase 2 (later)

Web UI drag-and-drop upload → Vercel Blob → auto-inserted markdown ref. Not yet built. For now, git-commit the files.

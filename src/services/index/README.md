# SynapsD

Naive implementation of a bitmap-centered context-based indexing engine.  
Main function is to:

- index all user-related events and data regardless of the source or location  
- provide relevant data to the context user is working in(user, global/system) 
- Optimize RAG workloads with contextual information
- (At some point) Integrate into the inference engine

## Architecture

- LMDB
- Roaring bitmaps
- flexsearch for full-text-search
- LanceDB

### Data pillar

- apps
- contacts
- devices
- identities
- roles
- services
- StoreD dataSources
- EventD eventSources

### Hashmaps

- KV in LMDB
- `checksum/<algo>/<checksum>` | objectID

### Bitmap indexes

- System (reserved id range, current values used as "system" context)
  - `device/uuid/<uuid12>` | bitmap
  - `device/type/<type>` | bitmap
  - `device/os/<os>` | bitmap
  - `action/<action>` | bitmap
- Context ("user" context)
  - `context/<uuid>` | bitmap; **Implicit AND** on all context bitmaps
- Features
  - `data/abstraction/{tab,note,file,email,...}` | bitmap
  - `mime/application/json` | bitmap
  - `data/abstraction/email/attachment` | bitmap  
  - `custom/<category>/<tag>` | bitmap; (custom/browser/chrome or custom/tag/work; **implicit OR**, NOT support via ! prefix)  
- Filters
  - `date/YYYYmmdd` | bitmap; AND, OR
  - `name/<bitmap-based-fts-test :)>` | bitmap
- Nested
  - `nested/<abstraction>/<id>` | bitmap
    `data/abstraction/contact/<uuid>` | bitmap
    `data/abstraction/email/from` | `data/abstraction/contact/<uuid>` (or a reference to a nested bitmap), to be figured out when I start integrating emails :)

## References

[0] Tbd

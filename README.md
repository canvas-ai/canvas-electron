<br />
<br />

<p align="center">
    <img src="https://raw.githubusercontent.com/idncsk/canvas-ui-electron/main/assets/logo_256x256.png" alt="Canvas Logo" width="96px">
</p>

<br />

<h1 align="center">Canvas</h1>
<h2 align="center">AI-powered context layer on top of your unstructured universe!</h2>

<br />

## Foreword / Beware!  

This project was started a looong time ago (first named "Workspaces") and was my first-ever Node.js + Electron endeavour. Some code snippets you may stumble upon date back to the dark ages of my JS knowledge hence may insult, even hurt more experienced programmers. In addition, 2020 to 2022 I took on a role as a freelance DevOps engineer for a major retail bank, which meant putting everything else besides the bare necessities on hold(people who suffered through a multimillion euro/dollar project behind schedule in this industry may know and most probably still vividly recall the pain). That being said, if you have any questions or need assistance with the setup, please do not hesitate to contact me directly. I will be more than happy to help! For the time being, please follow the development branch.

## Basic Concepts | What is Canvas

Canvas is a cross-platform desktop overlay to help organize my work / workflows and **data** into separate "contexts".

Contexts are represented by a tree structure resembling a file-system hierarchy; every tree node represents a separate layer filtering down all unstructured information fighting for my attention on a standard(tm) desktop setup(emails, notifications, chat messages, growing number of random browser tabs and ad-hoc download-extract-test-forget endeavors).  

A Canvas context tree is designed to be dynamic, supporting frequent changes to accommodate any structure needed to be productive:

```plain
universe://
    /Home
        /Music
        /Podcasts
            /Physics
            /Medicine
        /Library
            /Physics
            /Math
            /Medicine
        /Our new house
            /Heating
            /Electricity
            /Kitchen
                /Sinks
                /Materials
                    /Shinnoki
                    /Egger
                    /.. 
            /Project docs            
                /Archicad
                /Sketchup
                /Twinmotion
    /Edu
        /AIT
        /Physics
    /Work
        /AirBnB
            /Atlas Apartment
            /Fountainhead Apartment
        /Cu$tomer A 
                /Dev
                    /JIRA-1234
                    /JIRA-1237
                /Reports
                    /Compliance
                        /2022
                        /2023
        /SaaS Startup FOO
            /DC Frankfurt
                /network
                /hv
        /Billing
            /acme llc
                /2022
                /2023
            /acme inc
                /2023
                    /08        
```

Context URL  
``universe://work/customer-a/reports``  
will (presumably) return all reports for Customer A,  

``universe://reports``  
will return all reports indexed("linked") by the bitmap index of the "reports" layer for your entire universe.  

You want to prevent having multiple layers representing the same data. "Reports", "reports_new", "reports2", "customera-reports" should be represented by one layer - fe "reports", leaving the context(layer order) handle the filtering for you.  

This setup enables having the same data accessible through different, ad-hoc "filesystem-like" context paths:  
``universe://photos/2023/06``  
``universe://home/inspirations/kitchens``  
``universe://travel/Spain/2023``  
``universe://tasks/data-cleanup/2023/09``  
For the above example, all contexts return (among other data) the same file `IMG_1234.jpg` - a picture of a nice kitchen from an airbnb we stayed at. As a bonus - regardless of where it is stored(the storage part is abstracted away via storeD). Same goes for tabs, notes or any other documents - including the entropy-rich content of my ~/Downloads and ~/Desktop folders.  

There are 5 layer types:

- **Workspace**: Exportable, **shareable** collection of data sources and layers. By default, you start with an undifferentiated "universe". Workspaces in Canvas can have a primary color assigned. If they do, Canvas will automatically use gradients [of the primary workspace color] for individual data abstractions. 

- **Canvas**: A layer with multiple context, feature and/or filter bitmaps assigned that can optionally store Canvas UI layout and UI applet data. Canvases are the central piece of a lets say unorthodox approach to desktop environments, but more on that later.

- **Context**: The default layer type that links a context url part to one and only one context bitmap.

- **Filter**: Represents a single filter or feature bitmap*; example: `universe://customer_a/:emails/:today`, where :emails represents the "data/abstraction/email" feature bitmap, :today represents the "filter/datetime/today" filter.

- **Label**: A noop layer with no context or feature bitmap links


## Why Canvas you ask

There are couple of motivating factors for this project:

- I never really liked the "desktop" UI/UX, stacked nor tiled, and now [due to more mature libraries, better tooling in general, AI] it is finally feasible to experiment on my own implementation without burning 1/4 of an average human lifespan while doing so
- I never liked the rigidness of a flat, "static" file system hierarchy, always wanted to have dynamic "views" on top of my data without unwanted duplication or too much manual effort(this dates back to 2007? at that time I found out msft once worked on a similar - fs as a db - concept)
- I kept collecting \_RESTORE\_ and \_TO\_SORT\_ folders within other random \_TO\_SORT\_ folders, had data on a growing number of USB sticks, memory cards, \<random cloud provider\> instances and computers at work and in our household. I want to know where my rare-studio-recording-2008.mp3 is located("asus mp3 player", smb://nas.lan/some/random/folder, file://deviceid/foo/bar/baz/Downloads, timecapsule gps coordinates :)
- I want to have a working "roaming profile" experience across all my devices running linux and windows. On linux, ideally container-based applications I can freeze on logout/undock and unfreeze on a different linux machine(main motivation behind my iolinux distro experiment ~2017-2018)
- I want to easily discover peers, share files and collaborate on documents hosted publicly or on my own infrastructure
- I want to use all my computing devices seamlessly; export an application menu, toolbox or applet(music player of my HiFi-connected pc) to my phone or tablet, have my Canvas timeline on my phone so that whenever I search for some emails or notes, I can easily use swipe and zoom gestures to zoom into the time-frame of interest and filter out data I work on on my main workstation
- Pin devices to specific workspaces or contexts(fe my work nb to universe://work)
- Have a workforce of personal Canvas-integrated AI assistants(agents) that would keep track and monitor various contexts(tasks), notify me and do basic tasks autonomously
- Enable easy integration with other non-context-aware applications(kde/plasma activities were close but not close enough)

<br />

## Architecture

Some of the technologies used in no particular order:

- [Roaring bitmaps](https://roaringbitmap.org/)
- [LMDB](https://www.npmjs.com/package/lmdb) - Main in-process KV DB backend for storing document metadata and indexes(originally leveldb, currently evaluating pouchdb/couchdb)
- [FlexSearch](https://github.com/nextapps-de/flexsearch) - Fulltext search index, to-be replaced with ..bitmap indexes :)
- [express.js](https://expressjs.com/) - RestAPI and some of the UI elements like shared Workspaces or Canvases
- [socket.io](https://socket.io/) - Evaluated zeromq, wrote a custom nodejs net.ipc module(currently at services/\_old\_/net-ipc), currently socket.io
- [webdavd](https://github.com/OpenMarshal/npm-WebDAV-Server) - Canvas based dynamic Desktop and Downloads folders
- [cacache](https://www.npmjs.com/package/cacache) - Integral part of storeD for caching remote data locally
- [vLLM](https://github.com/vllm-project/vllm) - Currently evaluating as the LLM backend
- [electron](https://www.electronjs.org/) - Well ..it should be easy enough to migrate to a more lightweight solution later on

<br />

## Installation instructions

### ! Slowly separating some of the modules into their own repos for easier maintainability

- https://github.com/idncsk/canvas-ui-shell
- https://github.com/idncsk/canvas-ui-firefox-ext
- https://github.com/idncsk/canvas-ui-electron

### Canvas server

```bash
$ git clone git@github.com:idncsk/canvas.git /path/to/canvas
$ cd /path/to/canvas/app
$ npm install
$ npm run server    # Server backend only
$ npm run repl      # Server repl CLI
```

(Optional): Add `/path/to/canvas/bin` to your `$PATH`

```bash
$ echo PATH="$PATH:/path/to/canvas/bin" >> ~/.bashrc
```

### Canvas bash client

You can also install a bare-bones bash REST client:

```bash
$ git clone git@github.com:idncsk/canvas-ui-shell.git /path/to/canvas-shell
$ echo ". /path/to/canvas-shell/context.sh" >> ~/.bashrc
$ cd /path/to/canvas/app && npm run server
```

Currently, we only support a very limited API used mainly for development/testing purposes

- set: Sets a context URL
- url: Returns the current context url
- path: Returns the current context path
- paths: Returns the path representation of the current context tree
- tree: Returns the full Canvas context tree in plain JSON format
- bitmaps: Returns a summary of all in-memory bitmaps for the current context
- list: Lists all documents linked to the current context    
  - tabs: data/abstraction/tab
  - notes: data/abstraction/note
  - todo: data/abstraction/todo

### Canvas firefox extension

To install the firefox browser extension:  

- Open your browser and navigate to
**about:debugging#/runtime/this-firefox**
- Click on "Load Temporary Add-on"
- Navigate to canvas/ext/browser/firefox


### Portable installation

For **portable** use, download and extract nodejs and electron into the canvas/runtime folder

- Symlink electron-vNN-linux-x64 to electron-linux-x64
- Symlink node-vNN-linux-x64 to node-linux-x64
- Remove user/.ignore

<br />

## Configuration paths

Global app config: ``canvas/config``  
Default user home for portable use: ``canvas/user``  
default user home: ``$HOME/.canvas``  

Environment variables:

- CANVAS_USER_HOME
- CANVAS_USER_CACHE: Remnant from my custom linux distro times ([iolinux](https://iolinux.org) - a portable containerized "roaming" iolinux user env that you'd "dock" to a iolinux host system with an (optional) per-user zfs data-set for cache)
- CANVAS_USER_CONFIG
- CANVAS_USER_DATA
- CANVAS_USER_DB
- CANVAS_USER_VAR
- NODE_ENV
- LOG_LEVEL

<br />


## Using Canvas | CLI

TODO

## Using Canvas | REPL

TODO

## Using Canvas | RestAPI

TODO

## Social

I'm trying to motivate myself to do daily code updates by doing not-yet-but-soon-to-be live coding sessions(~~usually ~5AM - 6AM CEST~~). Wouldn't watch any of the existing videos _yet_, mostly OBS audio tests and a showcase of sleep deprivation, but you can subscribe for updates nevertheless.

YT Channel + Some (royalty-free) music used in my videos
- https://www.youtube.com/@idnc.streams
- https://soundcloud.com/idnc-sk/sets


<br />

## Support this project

- **By contributing to the codebase**
- **By testing the application and reporting bugs**
- By subscribing to the YT channel above (motivation++)
- By sponsoring some quality coffee via
  - <https://opencollective.com/idncsk>
  - <https://www.buymeacoffee.com/idncsk>
- **Or**, since I'd like to work on this project in an official part-time setup(stop saying open-source is free, it's not), by a monthly recurring payment of 10EUR (I tolerate some margin of error:) to IBAN: SK95 8330 0000 0023 0250 2806

**Any suggestions welcome** ("you should use \<module\> to do \<stuff\> instead of \<whatever nightmare you have currently implemented\>"), as a hobby-programmer this is really appreciated!


Thank you!

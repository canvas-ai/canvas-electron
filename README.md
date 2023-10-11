<br />
<br />

<p align="center">
    <img src="app/ui/assets/logo_1024x1024.png" alt="Canvas Logo" width="96px">
</p>

<br />

<h1 align="center">Canvas</h1>
<h2 align="center">AI-powered context layer on top of your unstructured universe!</h2>

<br />

## Basic Concepts | What is Canvas

Canvas is a cross-platform desktop overlay to help organize my work / workflows and **data** - regardless of its type and location - into separate "contexts".

Contexts are represented by a tree structure resembling a file-system hierarchy; every tree node represents a separate layer filtering down all the unstructured information fighting for my attention on a default desktop setup(emails, notifications, chat messages, always growing number of random browser tabs and ad-hoc download-extract-test-forget endeavors).  

A Canvas context tree is designed to be dynamic, supporting frequent changes to accommodate whatever structure is needed to get more productive:

```
universe://
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
```
Context URL  
``universe://work/customer-a/reports``  
will (presumably) return all reports for Customer A,  

``universe://reports``  
will return all reports indexed ("linked") by the bitmap index of the "reports" layer for your entire universe.  

You want to prevent having multiple layers representing the same data. "Reports", "reports_new", "reports2", "customera-reports" should be represented by one layer ("reports" for example), leaving the larger context(layer order) handle the filtering for you.  

This setup enables having the same data accessible through different, even ad-hoc and/or temporary "filesystem-like" context trees:  
``universe://photos/2023/06``  
``universe://home/inspirations/kitchens``  
``universe://travel/Spain/2023``  
``universe://tasks/data-cleanup/2023/09``  
For the above example, all contexts return (among other data) the same file `IMG_1234.jpg` - a picture of a nice kitchen from an airbnb we stayed at. As a bonus - regardless of where it is stored(the storage part is abstracted away via storeD). Same goes for tabs, notes or any other documents - including the entropy-rich content of your ~/Downloads and ~/Desktop folders.


There are 5 layer types:

- **Workspace**: Exportable, **shareable** collection of data sources and layers. By default, you start with an undifferentiated "universe". Workspaces in Canvas can have a primary color assigned. If they do, Canvas will automatically use gradients [of the primary workspace color] for individual data abstractions. This visual hint  makes searching through your universe easier .. and more fun. As you might have guessed, the default primary color of the universe is white(dispersive prisms are cool :)

- **Canvas**: A layer with multiple context, feature and/or filter bitmaps assigned that can optionally store Canvas UI layout and UI applet data.

- **Context**: The default layer type that links a context url part to one and only one context bitmap.

- **Filter**: Represents a single filter or feature bitmap*; example: ``universe://customer_a/:emails/:today``, where :emails represents the "data/abstraction/email" feature bitmap, :today represents the "filter/datetime/today" filter.

- **Label**: A noop layer with no context or feature bitmap links

<br />

## Architecture

Some of the technologies used in no particular order:

- Roaring bitmaps
- lmdb
- nedb (to keep part of the data easily readable and editable as local JSON files)
- FlexSearch
- express.js
- socket.io
- webdavd 
- cacache
- vLLM
- electron

<br />

## Installation instructions

Install the developer-friendly and currently the only version

```bash
$ git clone git@github.com:idncsk/canvas.git
$ cd canvas/app
$ npm install
$ npm run canvas # Electron UI
$ npm run server # Server backend only
$ npm run repl
```

(Optional): Add ``canvas/bin`` to your ``$PATH``  
(Optional): For a bare-bones bash client, source ``extensions/shell/context.sh``  
(Optional): To install the firefox browser extension:  

- Open your browser and navigate to
**about:debugging#/runtime/this-firefox**
- Click on "Load Temporary Add-on"
- Navigate to canvas/ext/browser/firefox

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
- CANVAS_USER_CACHE: Remnant from my custom linux distro times [iolinux] - a portable containerized "roaming" iolinux user env that you'd "dock" to a iolinux host system with an (optional) per-user zfs data-set for cache
- CANVAS_USER_CONFIG
- CANVAS_USER_DATA
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
- By subscribing to the YT channel above
- By sponsoring some quality coffee via
  - <https://opencollective.com/idncsk>
  - <https://www.buymeacoffee.com/idncsk>
- **Or**, since I need ~200EUR/MD to work on this project in a official part-time setup(stop saying open-source is free, it's not), by a monthly recurring payment of 10EUR (I tolerate some margin of error:) to IBAN: SK95 8330 0000 0023 0250 2806

For enterprise features (AAD integration, custom storage backends, integration with github, jira, msteams) there is always a one-time setup + a monthly maintenance cost involved to cover the added overhead.

**Any suggestions welcome** ("you should use \<module\> to do \<stuff\> instead of \<whatever nightmare you have currently implemented\>"), as a non-programmer this is really appreciated!


Thank you!

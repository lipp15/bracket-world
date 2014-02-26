bracket-world
=============

jQuery plugin to generate a customizable single-elimination tournament bracket of any size (2-n). 

- Uses HTML5 SVG to build the bracket structure based on specified options
- First round matches can be moved around to customize the look for bye situations
- Bracket visuals can be zoomed in/out and made into a horizontal or vertical structure
- Team names and seeds can be fed through the plugin options or via the API

Based off of the brackets used in http://bracket-world.com.

[View demos and documentation](http://mike-lipman.com/plugin/bracket-world/demo/index.html)

[Fiddle with an example](http://jsfiddle.net/lipp15/8MjyD/)

Minified size: ~20kb

## Start

Include the jquery.bracket-world.css file in the `<head>` section of your HTML document

```html
<link rel="stylesheet" href="path/to/your/jquery.bracket-world.css" />
```

Add this after your jQuery file include (usually just before the ending `</body>` tag):
```html
<script src="path/to/your/jquery.bracket-world.min.js"></script>
```

Define the container for the bracket. It can be any simple wrapper but if you choose to give it an id/class, it should not be 'bracket-area', which is reserved for the plugin:
```html
<div id="bracket1"></div>
```

Invoke the creation of a bracket in your js (jQuery) code - this creates the most basic of brackets:
```JavaScript
$('#bracket1').bracket();
```

Options can be sent in the invocation - this example creates an 11 team bracket, with 50 pixels of spacing from the top of the container in a 700 pixel vertical space, zoomed out to 75% scale with helper icons and specific team names/seeds:
```JavaScript
$('#bracket1').bracket(
{
    teams:11,
    topOffset:50,
    height:'700px',
    scale:0.75,
    icons:true,
    teamNames:
    [
        {
            name:'Illinois',
            seed:'6'
        },
        {
            name:'Iowa',
            seed:'11'
        },
        {
            name:'Indiana',
            seed:'5'
        },
        {
            name:'Penn State',
            seed:'4'
        },
        {
            name:'Michigan State',
            seed:'1'
        },
        {
            name:'Michigan',
            seed:'10'
        },
        {
            name:'Ohio State',
            seed:'7'
        },
        {
            name:'Wisconsin',
            seed:'9'
        },
        {
            name:'Minnesota',
            seed:'8'
        },
        {
            name:'Northwestern',
            seed:'3'
        },
        {
            name:'Purdue',
            seed:'2'
        }
    ]
});
```

Like any proper jQuery plugin, you can send a collection of DOM elements in the invocation
```JavaScript
$('#bracket1, #bracket2').bracket({teams:8});
```

## Options

#### teams

Between 2 and 256 (practical limit) - the number of teams in the bracket

Default: 2

#### scale

Between 0 and 1 - the zoom level of the bracket

Default: 0 (which means the plugin will calculate the default zoom level based on the # of teams)

#### scaleDelta

Between 0 and 1 - the amount of zoom change that occurs when zooming in/out 

Default: 0.25

#### height

Pixel height of the bracket area

Default: '500px' (does not impact the bracket itself as the area will scroll if it does not accomodate the dimensions)

#### topOffset

Pixel spacing between the top of the container and the top of the bracket

Default: 105

#### teamWidth

Pixel width of a team name in the bracket

Default: 200 (recommend not changing this unless also changing the font size in the css)

#### teamNames

JSON array representing team names and seeds to populate on the bracket. The order is top half bracket first round, top half bracket second round (if applicable), bottom half bracket first round, bottom half bracket second round (if applicable). See the [demo](http://mike-lipman.com/plugin/bracket-world/demo/index.html) for a look at how the ordering translates into the visual bracket.

Default: none

#### horizontal

0 or 1 - determines whether to display the bracket in a horizontal (1) or vertical (0) representation

Default: 1

#### rectFill

Color (hex or css-recognized string name) for the bracket's lines

Default: '#ff0000'

#### bgcolor

Background color (hex or css-recognized string name) for the bracket's container

Default: '#f2f2f2'

#### transition

Milliseconds or jQuery-recognized string that sets the transition speed for the .fadeIn()/.fadeOut() during bracket zooms/perspective changes

Default: 'fast'

#### icons

True or false - whether or not to show the zoom/perspective change icons above and below the bracket area

Default: true

## API

To perform operations on the bracket after invocation, leverage the .data("bracket") attribute that's a part of the returned jQuery object. All of the below methods can be chained.

#### zoomIn

Inputs:
- scale:    (optional) between 0 and 1, desired end scale for the bracket
- func:     (optional) callback function

Examples:

Default behavior of zooming in by scaleDelta (default: 25%):
```JavaScript
var theBracket = $('#bracket1').bracket({teams:7, height:'590px'});
thebracket.data("bracket").zoomIn();
```

Defining a scale and then taking an action after the zoom completes:
```JavaScript
var theBracket = $('#bracket1').bracket({teams:7, height:'590px'});
thebracket.data("bracket").zoomIn(0.75, function(e){alert('All Done Zooming In');});
```

#### zoomOut

Inputs:
- scale:    (optional) between 0 and 1, desired end scale for the bracket
- func:     (optional) callback function

Examples:

Default behavior of zooming out by scaleDelta (default: 25%):
```JavaScript
var theBracket = $('#bracket1').bracket({teams:7, height:'590px'});
thebracket.data("bracket").zoomOut();
```

Defining a scale and then taking an action after the zoom completes:
```JavaScript
var theBracket = $('#bracket1').bracket({teams:7, height:'590px'});
thebracket.data("bracket").zoomOut(0.25, function(e){alert('All Done Zooming Out');});
```

#### setVertical

Inputs:
- func:     (optional) callback function

Example:

Setting the bracket to a vertical perspective and taking an action after the switch completes:
```JavaScript
var theBracket = $('#bracket1').bracket({teams:7, height:'590px'});
thebracket.data("bracket").setVertical(function(e){alert('All Done Setting Vertical');});
```

#### setHorizontal

Inputs:
- func:     (optional) callback function

Example:

Setting the bracket to a horizontal perspective and taking an action after the switch completes:
```JavaScript
var theBracket = $('#bracket1').bracket({teams:7, height:'590px'});
thebracket.data("bracket").setHorizontal(function(e){alert('All Done Setting Horizontal');});
```

#### setTeams

Inputs:
- teamJSON:   team seed and names in JSON format.

To understand how these values are populated, look at your bracket in vertical orientation and the seeds/names will be added from top to bottom in the first round of the top half of the bracket followed by the second round of the top half of the bracket (if there are byes) then from top to bottom in the first round of the bottom half of the bracket followed by the second round of the bottom half of the bracket (if there are byes). See the [demo](http://mike-lipman.com/plugin/bracket-world/demo/index.html) for a look at how the ordering translates into the visual bracket.

Example:

```JavaScript
var theBracket = $('#bracket1').bracket({teams:7, height:'590px'});
thebracket.data("bracket").setTeams(
[
    {
        name:'Texas',
        seed:'5'
    },
    {
        name:'Kansas',
        seed:'4'
    },
    {
        name:'Kansas State',
        seed:'1'
    },
    {
        name:'Baylor',
        seed:'7'
    },
    {
        name:'Texas Tech',
        seed:'3'
    },
    {
        name:'TCU',
        seed:'2'
    },
    {
        name:'Oklahoma State',
        seed:'8'
    }
]);
```

## Notes
Tested in IE9+, Chrome, Firefox, Safari

Though not specifically coded in a responsive way, the bracket should scale nicely to different screen sizes - there is no width dependency and the area will simply scroll if the bracket's width goes outside the viewport.

Colors specific to the operation of moving matchups around to reposition bye lines can only be edited via the css.

## Changes

- Version 1.0
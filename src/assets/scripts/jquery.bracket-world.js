/**************************************************
jquery.bracket-world.js

Author: Mike Lipman
Date: 02/09/2014
Description: Enable a jQuery programmer to create a visual tournament bracket
Options:

	teams: 				between 2 and 256 (practical limit) - the number of teams in the bracket
	scale: 				between 0 and 1 - the zoom level of the bracket
	scaleDelta:   between 0 and 1 - the amount of zoom change that occurs when zooming in/out
	height: 			pixel height of the bracket area (does not impact the bracket itself - the area will scroll if it does not accomodate the dimensions)
	topOffset: 		pixel spacing between the top of the container and the top of the bracket
	teamWidth: 		pixel width of a team name in the bracket
	teamNames: 		JSON array representing team names and seeds to populate on the bracket - the order is top bracket first round, top bracket second round (if applicable), bottom bracket first round, bottom bracket second round (if applicable)
	horizontal: 	0 or 1 - determines whether to display the bracket in a horizontal (1) or vertical (0) representation
	rectFill: 		color (hex or css-recognized string name) for the bracket's lines 
	bgcolor: 			background color (hex or css-recognized string name) for the bracket's container
	transition: 	milliseconds or jQuery-recognized string that sets the transition speed for the fade in/out during bracket zooms/perspective changes
	icons: 				true or false - whether or not to show the zoom/perspective change icons above and below the bracket area

**************************************************/
(function($)
{
	// requires jQuery and its representation as $()
	if ($ === undefined) return;

	// number of pixels for the connector rect to overlap the end points of the two team rects in a matchup
	var connectorOffset = 7;

	// number of pixels for the rounded radius of the rects
	var roundedRadius = 5;

	// helper calculation, represents the thickness of each rect
	var roundedDiameter = roundedRadius * 2;

	// helper string to formulate the HTML for svg
	var svgStr = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1"';

	// pixel height of each team seed/name
	var inputHeight = 40;

	// additional pixel width between the team seed/name and its rect line
	var inputVertSpacing = 0;

	// additional left pixel padding for the team seed/name (right pixel padding if on the right side of a horizontal representation)
	var inputIndent = 1;

	// pixel spacing between the team seed and name
	var nameIndent = 35;

	/**************************************************
	bracket
	
	Main bracket plugin definition. Create a bracket object and construct the bracket given the options
	
	inputs:
			options: 	(optional) JSON of configuration options
	outputs:
			jQuery object
	**************************************************/
	$.fn.bracket = function(options)
	{
		// main bracket object
		var theBracket = null;

		// JSON settings
		var theSettings = null;

		// accomodate calling the plugin with collections
		this.each(function()
		{
			// invoke the constructor for the bracket object
			theBracket = new $.bracket($(this));

			// extend the default settings with the user input options JSON
			theBracket.settings = $.extend({}, theBracket.defaults, options);

			// holder for the bracket settings
			theSettings = theBracket.settings;

			// the number of teams defined in the settings
			theBracket.chosenNumTeams = theSettings.teams;

			// calculate the nearest power of 2 based on the number of teams in the bracket
			// logarithms are used to ease the calculation, though it's still a rather complex equation
			// if chosenNumTeams is a power of 2, numTeams will = chosenNumTeams
			// the case where there are only 2 teams breaks a few boundary conditions so it's handled as a special case
			theBracket.numTeams = ((theBracket.chosenNumTeams > 2) ? (Math.round(Math.pow(10, ((Math.ceil(Math.log(theBracket.chosenNumTeams) / Math.log(2))) * (Math.log(2) / Math.log(10)))))) : 4);

			// numTeams will be modified during bracket creation so a separate variable is used to store its original value
			theBracket.originalNumTeams = theBracket.numTeams;

			// in a non-power of 2 bracket, a number of teams will need to be removed from the initial creation of the bracket
			theBracket.numToRemove = theBracket.numTeams - theBracket.chosenNumTeams;

			// the number of rounds is primarily used for positioning matchups
			// The case where there are only 2 teams breaks a few boundary conditions so it's handled as a special case
			theBracket.numRounds = ((theBracket.chosenNumTeams > 2) ? Math.ceil(Math.log(theSettings.teams) / Math.log(2)) : 2);

			// holder for the topOffset JSON settings variable
			topOffset = theSettings.topOffset;

			// The 0.1 is essentially arbitrary - it nudges the right-side of the bracket in a horizontal representation to achieve the proper spacing, relative to the width of a line
			horizontalOffset = theSettings.teamWidth * 0.1;

			// Another arbitrary nudge right of the horizontal champion line, relative to the width of a line
			horizontalChampionTopOffset = theSettings.teamWidth * 0.45;

			// A final vertical nudge of the horizontal champion line, relative to the width of a line
			horizontalChampionLeftOffset = theSettings.teamWidth * 0.55;

			// template representing a matchup that includes three svg rects and two team seed/name areas
			templateHTML = '';
			templateHTML += '<div class="template matchup-outer">';
			templateHTML += '  <div class="matchup-inner">';
			templateHTML += '    <div class="svg-team-top">';
			templateHTML += '      <div class="svg-team-inner">';
			templateHTML += '        <div class="team-name team-name-top">Team</div>';
      templateHTML += '        <div class="team-seed"></div>';
			templateHTML += '      </div>';
			templateHTML += '    </div>';
			templateHTML += '    <div class="svg-team-bottom">';
			templateHTML += '      <div class="svg-team-inner">';
			templateHTML += '        <div class="team-name team-name-bottom">Team</div>';
      templateHTML += '        <div class="team-seed"></div>';
			templateHTML += '      </div>';
			templateHTML += '    </div>';
			templateHTML +=      svgStr + ' class="svg-container svg-container-line-top">';
			templateHTML += '      <rect x="0" y="0" rx="' + roundedRadius + '" ry="' + roundedRadius + '" width="' + theSettings.teamWidth + '" height="' + roundedDiameter + '" fill="' + theSettings.rectFill + '"></rect>';
			templateHTML += '    </svg>';
			templateHTML +=      svgStr + 'class="svg-container svg-container-line-bottom">';
			templateHTML += '      <rect x="0" y="0" rx="' + roundedRadius + '" ry="' + roundedRadius + '" width="' + theSettings.teamWidth + '" height="' + roundedDiameter + '" fill="' + theSettings.rectFill + '"></rect>';
			templateHTML += '    </svg>';
			templateHTML +=      svgStr + ' class="svg-container svg-container-line-connector">';
			templateHTML += '      <rect x="0" y="0" rx="' + roundedRadius + '" ry="' + roundedRadius + '" width="' + roundedDiameter + '" height="' + theBracket.originalBaseRoundHeight + roundedDiameter + inputHeight + inputVertSpacing + '" fill="' + theSettings.rectFill + '"></rect>';
			templateHTML += '    </svg>';
			templateHTML += '  </div>';
			templateHTML += '</div>';

			// if icons are requested, this creates the HTML for the top and bottom set
			iconHTML = '';
			if (theSettings.icons)
			{
				iconHTML += '<div class="bracket-area-main-icons">';
				iconHTML += '  <button class="zoom-in" href="#" alt="Zoom In" title="Zoom In">+</button>';
				iconHTML += '  <button class="zoom-out" href="#" alt="Zoom Out" title="Zoom Out">-</button>';
				iconHTML += '  <button class="set-vertical" href="#" alt="Vertical Bracket" title="Vertical Bracket">|</span></button>';
				iconHTML += '  <button class="set-horizontal active" href="#" alt="Horizontal Bracket" title="Horizontal Bracket">&mdash;</button>';
				iconHTML += '</div>';
			}

			// the skeleton puts the various HTML components together
			skeletonHTML = iconHTML;
			skeletonHTML += '<div class="bracket-area" style="height:' + theSettings.height + '; background-color:' + theSettings.bgcolor + ';">';
			skeletonHTML += '  <div class="svgs-cover">';
		  skeletonHTML += '    <div class="svg-group svgs">';
		  skeletonHTML += templateHTML;
			skeletonHTML += '    </div>';
			skeletonHTML += '    <div class="svg-group svgs-2">';
			skeletonHTML += templateHTML;
			skeletonHTML += '    </div>';
			skeletonHTML += '    <div class="champion svgs-horizontal-champion"></div>';
			skeletonHTML += '    <div class="champion svgs-vertical-champion"></div>';
			skeletonHTML += '  </div>';
			skeletonHTML += '</div>';
			skeletonHTML += iconHTML;
			
			// set the template HTML into the target element
			$(this).html(skeletonHTML);

			// exposes the bracket object so its methods can be used in an API-like fashion 
			$(this).data("bracket", theBracket);

			// if icons are specified, events are binded to the four buttons
			// each makes the appropriate API call and stops further processing to avoid duplicate execution
			if (theSettings.icons)
			{
				$('.zoom-in', $(this)).on('click', {thisBracket: $(this).data("bracket")}, function(e)
				{
					e.data.thisBracket.zoomIn();
					e.stopImmediatePropagation();
				});
				$('.zoom-out', $(this)).on('click', {thisBracket: $(this).data("bracket")}, function(e)
				{
					e.data.thisBracket.zoomOut();
					e.stopImmediatePropagation();
				});
				$('.set-vertical', $(this)).on('click', {thisBracket: $(this).data("bracket")}, function(e)
				{
					e.data.thisBracket.setVertical();
					e.stopImmediatePropagation();
				});
				$('.set-horizontal', $(this)).on('click', {thisBracket: $(this).data("bracket")}, function(e)
				{
					e.data.thisBracket.setHorizontal();
					e.stopImmediatePropagation();
				});
			}

			// main call to initiate the creation of a bracket and placed into the specified container
			createBracket($(this));

			// set the initial state of the vertical/horizontal icons
			if (theSettings.horizontal) $('.set-horizontal', $(this)).attr('disabled', 'disabled');
			else $('.set-vertical', $(this)).attr('disabled', 'disabled');
		});

		// enable jQuery chaining
		return this;
	};

	/**************************************************
	bracket
	
	Main bracket object definition with instance variables and methods to manipulate the bracket
	
	inputs:
			el: 	DOM element into which the bracket will be placed
	outputs:
			jQuery object
	**************************************************/
	$.bracket = function(el)
	{
		// default options - see top description for details
		this.defaults = 
		{
			teams: 2,
			scale: 0,
			scaleDelta: 0.25,
			height: '500px',
			topOffset: 105,
			teamWidth: 200,
			teamNames: [],
			horizontal: 1,
			rectFill: '#ff0000',
			bgcolor: '#f2f2f2',
			transition: 'fast',
			icons: true
		};
		this.settings = $.extend({}, this.defaults);

		// number of teams in the bracket
		this.chosenNumTeams = 0;

		// next highest power of 2 from chosenNumTeams - adjusted during the course of bracket construction
		this.numTeams = 0;

		// retains the original value of numTeams
		this.originalNumTeams = 0;

		// number of matchups to remove in a non-power of 2 bracket
		this.numToRemove = 0;

		// number of rounds for the bracket, derived from chosenNumTeams
		this.numRounds = 0;

		// counter to give each svg within a bracket a unique class name
		this.containerID = 1;

		// counter of how many matchups exist within a half of a bracket
		this.matchup = 1;

		// counter to give each team a unique class name
		this.teamID = 1;

		// counter to give each matchup a unique class name
		this.totalMatchup = 1;

		// status of a move in a non-power of 2 bracket
		this.bracketModeMove = false;

		// div representing the matchup that is being moved
		this.bracketModeMoveSource = null;

		// base pixel height of a round that does not include the team seed/name areas or rects 
		this.originalBaseRoundHeight = 80;

		// default pixel separation between matchups in the first round
		this.originalBaseRoundSeparation = 140;

		// height of the left half of the bracket, used to calculate the position of the right half in a vertical representation
		this.globalVerticalOffset = 0;

		// store the height of all rounds for easy access
		this.roundHeightArr = new Array();

		/**************************************************
		zoomIn
		
		Set any object variables and visual button states to zoom in on the bracket before invoking the main scaling function
		
		inputs:
				scale: 	(optional) between 0 and 1, desired end scale for the bracket
				func: 	(optional) callback function
		outputs:
				bracket object
		**************************************************/
		this.zoomIn = function(scale, func)
		{
			// if a scale isn't defined, the scaleDelta variable is used to set the new scale
			// if the scale goes outside the range of 0 and 1, it is adjusted appropriately
			if (scale === undefined)
			{
				this.settings.scale += this.settings.scaleDelta;
				this.settings.scale = ((this.settings.scale > 1) ? 1 : this.settings.scale);
			}
			else this.settings.scale = ((scale < 0) ? 0 : ((scale > 1) ? 1 : scale));

			// when at maximum scale, disable the zoom in and enable the zoom out
			if (this.settings.scale >= 1) $('.zoom-in', el).attr('disabled', 'disabled');
			else $('.zoom-out', el).removeAttr('disabled');

			// fade the cover which will temporarily hide the bracket
			// the callback function is passed through to the helper function where it will be invoked
			$('.svgs-cover', el).fadeOut(this.settings.transition, function()
			{
				scaleBracket(el, func);
			});

			// enable function chaining
			return this;
		};

		/**************************************************
		zoomOut
		
		Set any object variables and visual button states to zoom out on the bracket before invoking the main scaling function
		
		inputs:
				scale: 	(optional) between 0 and 1, desired end scale for the bracket
				func: 	(optional) callback function
		outputs:
				bracket object
		**************************************************/
		this.zoomOut = function(scale, func)
		{
			// if a scale isn't defined, the scaleDelta variable is used to set the new scale
			// if the scale goes outside the range of 0 and 1, it is adjusted appropriately
			if (scale === undefined)
			{
				this.settings.scale -= this.settings.scaleDelta;
				this.settings.scale = ((this.settings.scale <= 0) ? this.settings.scaleDelta : this.settings.scale);
			}
			else settings.scale = ((scale < 0) ? 0 : ((scale > 1) ? 1 : scale));

			// when at minimum scale, disable the zoom out and enable the zoom in
			if (this.settings.scale <= this.settings.scaleDelta) $('.zoom-out', el).attr('disabled', 'disabled');
			else $('.zoom-in', el).removeAttr('disabled');

			// fade the cover which will temporarily hide the bracket
			// the callback function is passed through to the helper function where it will be invoked
			$('.svgs-cover', el).fadeOut(this.settings.transition, function()
			{
				scaleBracket(el, func);
			});

			// enable function chaining
			return this;
		}

		/**************************************************
		setVertical
		
		Set any object variables and visual button states to orient the bracket vertically before invoking the main scaling function
		
		inputs:
				func: 	(optional) callback function
		outputs:
				bracket object
		**************************************************/
		this.setVertical = function(func)
		{
			// sanity check to ensure there's something to be done
			if (this.settings.horizontal)
			{
				// un-set the horizontal setting flag
				this.settings.horizontal = 0;

				// enable the horizontal icon
				$('.set-horizontal', el).removeAttr('disabled');

				// disable the vertical icon
				$('.set-vertical', el).attr('disabled', 'disabled');

				// fade the cover which will temporarily hide the bracket
				// the callback function is passed through to the helper function where it will be invoked
				$('.svgs-cover', el).fadeOut(this.settings.transition, function()
				{
					// hide the horizontal champion line
					$('.svgs-horizontal-champion', el).hide();

					// show the vertical champion line
					$('.svgs-vertical-champion', el).show();

					// reset the left positioning of the right half of the bracket so it's positioned in its natural state below the left half
					$('.svgs-2', el).css({'left':'0px'});

					// undo the rotations necessary in the horizontal perspective
					$('.svgs-2 .svg-team-top, .svgs-2 .svg-team-bottom', el).css(
						{
							'-ms-transform':'rotate(0deg) translateY(0px)',
							'-webkit-transform':'rotate(0deg) translateY(0px)',
							'-moz-transform':'rotate(0deg) translateY(0px)'
						});

					// call the helper function to scale the bracket
					scaleBracket(el, func);
				});
			}

			// enable function chaining
			return this;
		};

		/**************************************************
		setHorizontal
		
		Set any object variables and visual button states to orient the bracket horizontally before invoking the main scaling function
		
		inputs:
				func: 	(optional) callback function
		outputs:
				bracket object
		**************************************************/
		this.setHorizontal = function(func)
		{
			// sanity check to ensure there's something to be done
			if (!this.settings.horizontal)
			{
				// holder for the main bracket object to be used within the fadeOut callback
				var localThis = this;

				// set the horizontal setting flag
				this.settings.horizontal = 1;

				// disable the horizontal icon
				$('.set-horizontal', el).attr('disabled', 'disabled');

				// enable the vertical icon
				$('.set-vertical', el).removeAttr('disabled');

				// fade the cover which will temporarily hide the bracket
				// the callback function is passed through to the helper function where it will be invoked
				$('.svgs-cover', el).fadeOut(this.settings.transition, function()
				{
					// hide the vertical champion line
					$('.svgs-vertical-champion', el).hide();

					// show the horizontal champion line
					$('.svgs-horizontal-champion', el).show();

					// set the left positioning of the right half of the bracket so it's positioned alongside the left bracket
					$('.svgs-2', el).css({'left':'' + (2 * (localThis.numRounds * localThis.settings.teamWidth) + horizontalOffset) + 'px'});

					// set the horizontal translations as necessary for the horizontal perspective of the team seeds/names
					// since the bracket is turned upside down, the team seeds/names need to be moved to the other side of their lines
					var translation = parseInt((inputHeight + (inputVertSpacing * 2) + roundedDiameter), 10);
					$('.svgs-2 .svg-team-top, .svgs-2 .svg-team-bottom', el).css(
						{
							'-ms-transform':'rotate(180deg) translateY(-' + translation + 'px)',
							'-webkit-transform':'rotate(180deg) translateY(-' + translation + 'px)',
							'-moz-transform':'rotate(180deg) translateY(-' + translation + 'px)'
						});

					// call the helper function to scale the bracket
					scaleBracket(el, func);
				});
			}

			// enable function chaining
			return this;
		}

		/**************************************************
		setHorizontal
		
		Set any object variables and visual button states to orient the bracket horizontally before invoking the main scaling function
		
		inputs:
				teamJSON: 	team seed and names in JSON format
		outputs:
				bracket object
		**************************************************/
		this.setTeams = function(teamJSON)
		{
			// set the bracket object's settings variable with the new list
			this.settings.teamNames = teamJSON;

			// call the helper function to populate the teams on the bracket
			populateTeams(el);

			// enable function chaining
			return this;
		}
	}

	/**************************************************
	createBracket

	main function to initiate the bracket creation process

	inputs:
		el: 	DOM element into which the bracket will be placed
	**************************************************/ 
	function createBracket(el)
	{
		// holder for the main bracket object
		var localBracket = el.data("bracket");

		// holder for the main settings object
		var localSettings = localBracket.settings;

		// remove any remnant of the bracket from the DOM
		clearBracket(el);
		
		// set optimal scale if none specified in settings given the # of rounds
		if (localSettings.scale === 0)
		{
			if (localBracket.numRounds >= 7) localSettings.scale = 0.25;
			else if (localBracket.numRounds >= 5) localSettings.scale = 0.5;
			else if (localBracket.numRounds >= 4) localSettings.scale = 0.75;
			else localSettings.scale = 1;
		}

		// draw the left (top) half of the bracket 
		drawBracket((localBracket.numTeams / 2), (localBracket.numRounds - 1), 'svgs', el);

		// draw the right (bottom) half of the bracket
		drawBracket((localBracket.numTeams / 2), (localBracket.numRounds - 1), 'svgs-2', el);

		// draw the champion lines (not belonging to either bracket half)
		drawHorizontalChampion(true, el);
		drawVerticalChampion(true, el);

		// scale the bracket based on the number of rounds
		scaleBracket(el);

		// the bracket will contain the closest power of 2 setup so matchups will need to be removed if the number of team is not a power of 2
		removeLines(el);

		// place the specified team names into the relevant slots (if specified)
		populateTeams(el);

		// first-round matchups in a non-power of 2 bracket will have the bracketmode-inner class attached to an upper-level div
		// clicking on one of these matchups will first 'activate' it by sliding it up a few pixels
		// at that point an open slot can be clicked and the matchup will be moved into that slot
		// if a tap/click is made anywhere else on the screen the matchup becomes 'deactivated' and it returns to its original position
		$('.bracketmode-inner', el).on('click', function(e)
		{
			// holder for the correct vertical position of the matchup
			var oldTopPosition = $(this).css('top');

			// remove the 'px' from the css top string and await further calculation
			var newTopPosition = parseInt(oldTopPosition.substring(0, oldTopPosition.length - 2), 10);

			// If the team nodes being swapped are on the right bracket, the top position adjustment needs to be reversed
			if ((localSettings.horizontal) && ($(this).closest('.svgs-2').length > 0)) newTopPosition += 10;
			else newTopPosition -= 10;

			// if a move is already in progress, the bracket can be reset because the tap/click was not on an open node
			if (localBracket.bracketModeMove) resetBracket(el);
			else
			{
				// define a bracket area-wide click event to cancel the move unless clicking on a drop zone
				$('.bracket-area', el).on('click', function(e)
				{
					// if the target of the click has the bracket-drop-zone class, proceed in the event bubbling
					// otherwise the move is being cancelled so the bracket is reset and there is no longer a need to listen for clicks in the bracket area
					if (e.target.className.indexOf('bracket-drop-zone') > 0) return true;
					else if (localBracket.bracketModeMove)
					{
						resetBracket(el);
						$('.bracket-area', el).off('click');
					}
				});

				// set the move state of the bracket object to true to ensure only one is moved at once
				localBracket.bracketModeMove = true;

				// holder for the DOM representation of the matchup
				localBracket.bracketModeMoveSource = $(this);

				// animate the motion of the selected matchup and add the selected class for styling
				$(this).animate({top:newTopPosition + 'px'}).removeClass('selected').addClass('selected');

				// only the eligible nodes will have the bracketmode-outer class so make them drop zones for styling and other event handling
				$('.matchup-outer.bracketmode-outer', el).removeClass('bracket-drop-zone').addClass('bracket-drop-zone');

				// clicking on a drop zone will place the activated matchup into that slot and swap any bye lines
				$('.bracket-drop-zone', el).on('click', function(e)
				{
					// sanity check to ensure there is an active matchup set to be moved
					if (localBracket.bracketModeMove)
					{
						// jQuery representation of the target - since only class names are used, it's a simple replace to get the full selector
						var $target = $('.' + e.target.className.replace(/ /g, '.'), el);

						// the number of first round matches in the bracket  
						var totalFirstRoundMatches = parseInt((localBracket.originalNumTeams / 4), 10);

						// the number of matches in a bracket half
						var topBracketMatches = parseInt((localBracket.originalNumTeams / 2), 10) - 1;

						// the start boundary ordinal number takes into account all of the matchups in the top half of the bracket
						var startSecondBracketFirstRound = topBracketMatches + 1;

						// the brackets are powers of 2 so they're symmetrical meaning the ending boundary can add the previous result to the number of first round matches
						var endSecondBracketFirstRound = startSecondBracketFirstRound + totalFirstRoundMatches;
						
						// strip away the class name down to the ordinal number, which represents where the matchup is being added
						curInnerPos = parseInt($target.attr('class').replace('matchup-outer matchup-', '').replace(' bracketmode-outer', ''), 10);

						// the new matchup position is calculated to identify the team that needs to be moved 						
						var newInnerPos = 0;
						if ($target.closest('.svgs-2').length > 0)
							newInnerPos = endSecondBracketFirstRound + Math.ceil((curInnerPos - startSecondBracketFirstRound) / 2);
						else
							newInnerPos = totalFirstRoundMatches + Math.ceil(curInnerPos / 2);

						// team area that will be moved to the original location (that is left as a bye as a result of the move)
						var $teamToMove = $('.svg-team-' + ((curInnerPos % 2 > 0) ? 'top' : 'bottom'), $('.matchup-' + newInnerPos, el));

						// only execute if there's a team name that actually needs to be moved
						if (($('.team-name', $teamToMove).html() != '') || ($('.team-seed', $teamToMove).html() != ''))
						{
							// strip away the class name down to the ordinal number, which represents where the matchup is being taken from
							var sourceCurInnerPos = parseInt(localBracket.bracketModeMoveSource.closest('.matchup-outer').attr('class').replace('matchup-outer matchup-', ''), 10);

							// the new matchup position is calculated to carry forward a team into the next round (the 'bye')
							// the new position calculation is different depending on which half of the bracket is impacted
							var sourceNewInnerPos = 0;
							if ((localBracket.bracketModeMoveSource).closest('.svgs-2').length > 0)
								sourceNewInnerPos = endSecondBracketFirstRound + Math.ceil((sourceCurInnerPos - startSecondBracketFirstRound) / 2);
							else
								sourceNewInnerPos = totalFirstRoundMatches + Math.ceil(sourceCurInnerPos / 2);

							// the source team area now becomes the 'bye' line
							var $sourceTeamArea = $('.svg-team-' + ((sourceCurInnerPos % 2 > 0) ? 'top' : 'bottom'), $('.matchup-' + sourceNewInnerPos, el));

							// the round number is used to calculate positioning for the subsequent drawTeam function
							var roundNum = parseInt($('.matchup-' + sourceNewInnerPos, el).attr('rel').replace('round', ''), 10);

							// set the positioning of the team name because it may not have any from the original bracket creation
							drawTeam(((sourceCurInnerPos % 2 > 0) ? 'top' : 'bottom'), localBracket.teamID++, $('.matchup-' + sourceNewInnerPos, el), localBracket.roundHeightArr[roundNum], el);

							// the drawTeam function places generic information into the team seed/name area so it must be populated with real data
							$('.team-name', $sourceTeamArea).html($('.team-name', $teamToMove).html());
							$('.team-seed', $sourceTeamArea).html($('.team-seed', $teamToMove).html());

							// clear out the area from which the team is being moved
							$('.team-name', $teamToMove).html('');
							$('.team-seed', $teamToMove).html('');
						}
						
						// move the entire DOM element representing the active matchup into the target
						$target.append(localBracket.bracketModeMoveSource);

						// if the bracket is in the horizontal perspective and a matchup is being moved to the right bracket it must be transformed
						// in any other case, the transformation values are reset
						if (($target.closest('.svgs-2').length > 0) && (localSettings.horizontal))
						{
							// set the horizontal translations as necessary for the horizontal perspective of the team seeds/names
							// since the bracket is turned upside down, the team seeds/names need to be moved to the other side of their lines
							var translation = parseInt((inputHeight + (inputVertSpacing * 2) + roundedDiameter), 10);
							$('.svg-team-top, .svg-team-bottom', localBracket.bracketModeMoveSource).css(
							{
								'-ms-transform':'rotate(180deg) translateY(-' + translation + 'px)',
								'-webkit-transform':'rotate(180deg) translateY(-' + translation + 'px)',
								'-moz-transform':'rotate(180deg) translateY(-' + translation + 'px)'
							});
						}
						else
						{
							$('.svg-team-top, .svg-team-bottom', localBracket.bracketModeMoveSource).css(
							{
								'-ms-transform':'rotate(0deg) translateY(0px)',
								'-webkit-transform':'rotate(0deg) translateY(0px)',
								'-moz-transform':'rotate(0deg) translateY(0px)'
							});
						}

						// reset all outer containers with the bracketmode-outer class before removing it from ineligible nodes
						$('.matchup-outer', el).removeClass('bracketmode-outer').addClass('bracketmode-outer');

						// remove the bracketmode-outer class from any outer container that has a matchup already inside of it
						// this makes it ineligble to have a matchup be moved into it
						$.each($('.matchup-outer.bracketmode-outer', el), function(i, val)
						{
							if ($('.matchup-inner', $(this)).length > 0) $(this).removeClass('bracketmode-outer').removeClass('bracket-drop-zone');
						});

						// no longer a need to listen for clicks on bracket drop zones since there will no longer be any
						$('.bracket-drop-zone', el).off('click');

						// ensure all brackets are positioned appropriately in their current resting places
						resetBracket(el);

						e.stopImmediatePropagation();
					}
				});

				e.stopImmediatePropagation();
			}
		});

		// different adjustments are needed to the champion lines and the placement of the right half of the bracket based on the bracket representation
		if (localSettings.horizontal)
		{
			// hide the vertical champion line
			$('.svgs-vertical-champion', el).hide();

			// set the left positioning of the right bracket to the width of the left bracket plus the offset
			$('.svgs-2', el).css({'left':'' + (2 * (localBracket.numRounds * localSettings.teamWidth) + horizontalOffset) + 'px'});

			// when the bracket is rotated into place, it will be upside-down so the team seeds/names need to be adjusted to the other side of their lines
			var translation = parseInt((inputHeight + (inputVertSpacing * 2) + roundedDiameter), 10);
			$('.svgs-2 .svg-team-top, .svgs-2 .svg-team-bottom', el).css(
				{
					'-ms-transform':'rotate(180deg) translateY(-' + translation + 'px)',
					'-webkit-transform':'rotate(180deg) translateY(-' + translation + 'px)',
					'-moz-transform':'rotate(180deg) translateY(-' + translation + 'px)'
				});
			
			// Safari seems to have a quirk that requires the bracket to be redrawn on initial load in order to get the spacing right
			//if ($('.safari').length > 0) $('.svgs-cover', el).hide('fast', function() {scaleBracket(el);});
		}
		else
		{
			// hide the horizontal champion if in a vertical representation
			$('.svgs-horizontal-champion', el).hide();

			// reset the left position of the bottom half of the bracket
			$('.svgs-2', el).css({'left':'0px'});

			// reset the position of the team seeds/names
			$('.svgs-2 .svg-team-top, .svgs-2 .svg-team-bottom', el).css(
				{
					'-ms-transform':'rotate(0deg) translateY(0px)',
					'-webkit-transform':'rotate(0deg) translateY(0px)',
					'-moz-transform':'rotate(0deg) translateY(0px)'
				});
		}
	}

	/**************************************************
	resetBracket

	resets any matchups being moved and the class names for any outer and inner nodes

	inputs:
		el: 	DOM element into which the bracket will be placed
	**************************************************/ 
	function resetBracket(el)
	{
		// holder for the main bracket object
		var localBracket = el.data("bracket");

		// reset the position of the DOM representing the activated matchup
		localBracket.bracketModeMoveSource.css({'top':'0px', 'left':'0px'});

		// set the activated matchup indicator to false
		localBracket.bracketModeMove = false;

		// remove any drop-zone class names from the outer nodes for styling and click event removal
		$('.matchup-outer.bracketmode-outer', el).removeClass('bracket-drop-zone').removeClass('bracket-drop-zone-hover');

		// remove any selected class names from the inner nodes for styling
		$('.matchup-inner.bracketmode-inner', el).removeClass('selected');
	}

	/**************************************************
	drawBracket

	draws one half of the bracket
	each matchup consists of 3 svg rect lines
	the number of matchups is based on the number of overall teams
	calculations are done to determine the dimensions and positioning of the svg lines

	inputs:
		bracketTeams: 	number of teams for the bracket half
		bracketRounds: 	number of rounds for the bracket half
		divName: 				name of the DOM element into which the bracket half will be placed
		el: 						DOM element into which the bracket will be placed
	**************************************************/ 
	function drawBracket(bracketTeams, bracketRounds, divName, el)
	{
		// holder for the main bracket object
		var localBracket = el.data("bracket");

		// holder for the main bracket's settings
		var localSettings = localBracket.settings;

		// local variable to represent the number of teams for the bracket half - will be modified later in the function
		var numTeams = bracketTeams;

		// local variable to represent the number of rounds for the bracket half - will be modified later in the function
		var numRounds = bracketRounds;

		// local variable to represent the height of a matchup - will be adjusted as the round number increases
		var baseRoundHeight = localBracket.originalBaseRoundHeight;

		// local variable to represent the separation between matchups - will be adjusted as the round number increases
		var baseRoundSeparation = localBracket.originalBaseRoundSeparation;

		// left position of a matchup
		var firstTeamX = 0;

		// top position of a matchup
		var firstTeamY = 0;

		// starting vertical position of a round
		var topOffset = 0;

		// template HTML for an svg rect with the given defaults/settings
		var teamRect = '<rect x="0" y="0" rx="' + roundedRadius + '" ry="' + roundedRadius + '" width="' + localSettings.teamWidth + '" height="' + (roundedRadius * 2) + '" fill="' + localSettings.rectFill + '"> </rect>';
		
		// loop over each round to construct the necessary matchups for the bracket half
		for (var i = 1; i <= numRounds; i++)
		{
			// positioning adjustments are needed for the base calculators if not in the first round
			if (i > 1)
			{
				// find the midpoint in the previous round by taking the entire matchup height and dividing by two
				topOffset += (baseRoundHeight + inputHeight + inputVertSpacing) / 2;

				// the new height for a round is based on the previous rounds' height plus the separation between matchups in the previous round with the space for the team seed/name subtracted off
				baseRoundHeight = baseRoundHeight + baseRoundSeparation - inputHeight - inputVertSpacing;

				// the new separation between matchups in the current round is the height of an entire matchup (including team names) in this round
				baseRoundSeparation = baseRoundHeight + (2 * (inputHeight + inputVertSpacing));
			}

			localBracket.roundHeightArr[localBracket.roundHeightArr.length] = baseRoundHeight;
			
			// the number of teams in each round is half of the previous round
			numTeams = (i == 1) ? numTeams : (numTeams / 2);

			// the number of matchups in the current round
			localBracket.matchup = 1;

			// iterate over the number of teams in the round - since two teams are used in each matchup, subtract by two for each loop iteration
			for (var j = 1; j <= numTeams; j+=2)
			{
				// sanity check to ensure there are two teams to use
				if ((j + 1) <= numTeams)
				{
					// the left position of a matchup is the width of a team name line multiplied by the current round number
					firstTeamX = (i - 1) * localSettings.teamWidth;

					// the top position of a matchup starts with the top offset of the current round and adds the height of each matchup that has come before it in the current round
					firstTeamY = topOffset + ((localBracket.matchup - 1) * (baseRoundHeight + baseRoundSeparation));
					
					// set a jQuery object representing a matchup based on the HTML template
					var $div = $('.' + divName + ' .template', el).clone(true).removeClass('template');

					// set a unique class identifier and round identifier
					// a slight adjustment is needed for the top position to account for the height of the team seed/name area
					// the height takes into account the base height for matchups in the round in addition to the height for the two teams
					// the width calculation is straightforward, taking into account the connectorOffset to eliminate disconnected lines
					$div
						.addClass('matchup-' + localBracket.totalMatchup)
						.attr('rel', 'round' + (i - 1))
						.css(
						{
							'position':'absolute',
							'top':(firstTeamY - inputHeight - inputVertSpacing) + 'px',
							'left':firstTeamX + 'px',
							'height':(baseRoundHeight + roundedDiameter + (2 * (inputHeight + inputVertSpacing))) + 'px',
							'width':(localSettings.teamWidth + connectorOffset) + 'px'
						});

					// set a unique class identifier for the inner container
					// the height and width are set as in its container
					$('.matchup-inner', $div)
						.addClass('matchup-' + localBracket.totalMatchup + '-content')
						.css(
						{
							'height':(baseRoundHeight + roundedDiameter + (2 * (inputHeight + inputVertSpacing))) + 'px',
							'width':(localSettings.teamWidth + connectorOffset) + 'px'
						});

					// team seeds/names only go in first round matchups, otherwise clear out the templated content
					if (i <= 1)
					{
						// set the team seeds/names - if the JSON array has been passed and teams are present those will be used
						drawTeam('top', localBracket.teamID++, $div, baseRoundHeight, el);
						drawTeam('bottom', localBracket.teamID++, $div, baseRoundHeight, el);

						// in a non-power of 2 bracket set the special bracketmode classes on the matchups 
						if (localBracket.numToRemove > 0)
						{
							$div.addClass('bracketmode-outer');
							$('.matchup-inner', $div).addClass('bracketmode-inner');
						}
					}
					else $('.team-name, .team-seed', $div).html('');

					// set the parameters of the top svg with a unique class name
					// the top position is calculated by the height of the team seed/name area
					$('.svg-container-line-top', $div)
						.attr('class', $('.svg-container-line-top', $div).attr('class') + ' svg-container-' + localBracket.containerID++)
						.css(
						{
							'position':'absolute',
							'top':(inputHeight + inputVertSpacing) + 'px',
							'left':'0px',
							'height':roundedDiameter + 'px',
							'width':localSettings.teamWidth + 'px'
						});

					// set the parameters of the top rect
					$('.svg-container-line-top rect', $div)
						.attr('rx', roundedRadius).attr('ry', roundedRadius)
						.attr('width', localSettings.teamWidth)
						.attr('height', roundedDiameter)
						.attr('fill', localSettings.rectFill);

					// set the parameters of the bottom svg with a unique class name
					// the top position is calculated based on the standard base height added to the height of both team seed/name areas
					$('.svg-container-line-bottom', $div)
						.attr('class', $('.svg-container-line-bottom', $div).attr('class') + ' svg-container-' + localBracket.containerID++)
						.css(
						{
							'position':'absolute',
							'top':(baseRoundHeight + (2 * (inputHeight + inputVertSpacing))) + 'px',
							'left':'0px',
							'height':roundedDiameter + 'px',
							'width':localSettings.teamWidth + 'px'
						});

					// set the parameters of the top rect
					$('.svg-container-line-bottom rect', $div)
						.attr('rx', roundedRadius).attr('ry', roundedRadius)
						.attr('width', localSettings.teamWidth)
						.attr('height', roundedDiameter)
						.attr('fill', localSettings.rectFill);

					// set the parameters of the vertical connector svg with a unique class name
					// the top position is the same as the top svg
					// the left position is the length of the team lines added to the small connector offset
					// the height is the height of the matchup added to the height of the bottom team seed/name area
					$('.svg-container-line-connector', $div)
						.attr('class', $('.svg-container-line-connector', $div).attr('class') + ' svg-container-' + localBracket.containerID++)
						.css(
						{
							'position':'absolute',
							'top':(inputHeight + inputVertSpacing) + 'px',
							'left':(localSettings.teamWidth - connectorOffset) + 'px',
							'height':(baseRoundHeight + roundedDiameter + inputHeight + inputVertSpacing) + 'px',
							'width':roundedDiameter + 'px'
						});

					// set the parameters of the top rect
					$('.svg-container-line-connector rect', $div)
						.attr('rx', roundedRadius).attr('ry', roundedRadius)
						.attr('width', roundedDiameter)
						.attr('height', (baseRoundHeight + roundedDiameter + inputHeight + inputVertSpacing))
						.attr('fill', localSettings.rectFill);

					// set the entire matchup into the DOM element representing the half of the bracket
					$('.' + divName, el).append($div);

					// increment the total number of matchups for the entire bracket
					localBracket.totalMatchup++;

					// increment the total number of matchups for the half bracket
					localBracket.matchup++;
				}
			}
		}

		// define the top offset for the final winner line of the bracket half as the midpoint of the height of the previous round's matchup
		topOffset += baseRoundHeight / 2;
		
		// build the HTML for the final line and position using a slight adjustment to the top to account for the team seed/name height
		totalHTML = '';
		totalHTML += '<div class="matchup-outer matchup-' + localBracket.totalMatchup + '" rel="round' + localBracket.numRounds + '" style="top:' + (topOffset - ((inputHeight + inputVertSpacing) / 2)) + 'px; left:' + ((i - 1) * localSettings.teamWidth) + 'px; height:' + (roundedDiameter + inputHeight + inputVertSpacing) + 'px; width:' + localSettings.teamWidth + 'px;">';
		totalHTML += '  <div class="matchup-inner matchup-' + localBracket.totalMatchup + '-content" style="height:' + (roundedDiameter + inputHeight + inputVertSpacing) + 'px; width:' + localSettings.teamWidth + 'px;">';
		totalHTML +=      svgStr + ' class="svg-container svg-container-line-top svg-container-' + localBracket.containerID++ + '" style="top:' + (inputHeight + inputVertSpacing) + 'px; left:0px; height:' + roundedDiameter + 'px; width:' + localSettings.teamWidth + 'px;">';
		totalHTML += '        <rect x="0" y="0" rx="' + roundedRadius + '" ry="' + roundedRadius + '" width="' + localSettings.teamWidth + '" height="' + roundedDiameter + '" fill="' + localSettings.rectFill + '"> </rect>'
		totalHTML += '      </svg>';
		totalHTML += '  </div>';
		totalHTML += '</div>';

		// insert the winner line into the DOM
		$('.' + divName, el).append(totalHTML);
	
		// increment the total number of matchups for the entire bracket
		localBracket.totalMatchup++;

		// adjust the display of the entire second half of the bracket
		if (divName.indexOf('2') >= 0)
		{
			// get the css top for the final matchup in the first round, subtracting out the 'px'
			var divTop = parseInt($('.matchup-' + ((bracketTeams * 2) / 4), el).css('top').substring(0, $('.matchup-' + ((bracketTeams * 2) / 4), el).css('top').length - 2), 10);

			// if the top is negative (for very small brackets), it shouldn't be used in further calculations 
			if (divTop < 0) divTop = 0;

			// the total height of the left half of the bracket is calculated by taking the top of the final matchup in the first round plus the height of that matchup
			// the topOffset is used to give additional spacing before the start of the bottom half of the bracket
			var totalHeight = ((divTop) + $('.matchup-' + ((bracketTeams * 2) / 4), el).height() + topOffset);

			// set the top position of the bottom (right) half of the bracket
			$('.' + divName, el).css({'top':'' + totalHeight + 'px'});

			// set the entire height of both halves of the bracket
			localBracket.globalVerticalOffset = totalHeight;
		}	
	}

	/**************************************************
	drawTeam

	helper function to place a team seed/name on a line

	inputs:
		position: 				'top' or 'bottom' team name slot within a matchup
		ordinal: 					unique class name ordinal for the inner DOM element
		elem: 						DOM element into which the team seed/name will be placed
		baseRoundHeight: 	height of the current round in the bracket construction process
	**************************************************/ 
	function drawTeam(position, ordinal, elem, baseRoundHeight, el)
	{
		// holder for the main bracket object
		var localBracket = el.data("bracket");

		// set the unique class name for the team DOM element
		// for the top position of the bottom name in a matchup the position is calculated by taking the height of a matchup in the given round added to the height of the top seed/name area
		$('.svg-team-' + position + '', elem)
			.addClass('svg-team-' + position + '-' + localBracket.totalMatchup)
			.css(
			{
				'position':'absolute',
				'top':((position.indexOf('top') >= 0) ? 0 : (baseRoundHeight + inputHeight + inputVertSpacing)) + 'px',
				'left':inputIndent + 'px',
				'width':localBracket.settings.teamWidth + 'px',
				'height':inputHeight + 'px'
			});

		// set a unique class name and rel attribute for the inner DOM element
		$('.svg-team-' + position + ' .svg-team-inner', elem)
			.addClass('svg-team-inner-' + ordinal)
			.attr('rel', 'svg-team-inner-' + ordinal);

		// set a unique class name for the team name and input a placeholder team name (it will be populated later)
		$('.team-name-' + position + '', elem)
			.addClass('team-name-' + ordinal)
			.css({'width':(localBracket.settings.teamWidth - nameIndent) + 'px',})
			.text($('.team-name-' + position + '', elem).text() + ' ' + ordinal);
	}

	/**************************************************
	drawTeam

	remove lines for non-power of 2 tourneys and add the team that gets the bye into the next round

	inputs:
		el: 	DOM element from which the lines will be removed
	**************************************************/
	function removeLines(el)
	{
		// holder for the main bracket object
		var localBracket = el.data("bracket");

		// holder for the main bracket's settings
		var localSettings = localBracket.settings;

		// the number of first round matches in the bracket  
		var totalFirstRoundMatches = parseInt((localBracket.originalNumTeams / 4), 10);

		// each matchup has three lines - the top, bottom and connector
		var totalFirstRoundLines = totalFirstRoundMatches * 3;

		// the number of matches in a bracket half
		var topBracketMatches = parseInt((localBracket.originalNumTeams / 2), 10) - 1;

		// each matchup has three lines in addition to the bracket half's winner
		var topBracketLines = (topBracketMatches * 3) + 1;

		// iterator for svg rects starting with the first svg in the top (left) bracket
		var startCounter = 1;

		// iterator for svg rects starting with the first svg in the bottom (right) bracket
		var endCounter = topBracketLines + 1;

		// number representing the ordinal class name for the final svg in the bottom (right) bracket
		var endPoint = endCounter + totalFirstRoundLines;

		// will represent a jQuery object for the team seed/name
		var $div = null;

		// execute a removal for however many teams need to be removed from the power of 2 bracket that has been created
		for (var k = 1; k <= localBracket.numToRemove; k++)
		{
			// determine which bracket half should be operated on
			// teams are first removed from the top half, then the bottom half, then the top half, etc.
			if (k % 2 > 0)
			{
				// strip away the class name down to the ordinal number, which represents the matchup number where lines should be removed
				var curInnerPos = parseInt($('.svg-container-' + startCounter, el).closest('.matchup-inner').attr('class').replace('matchup-inner matchup-', '').replace('-content', ''), 10);

				// the new matchup position is calculated to carry forward a team into the next round (the 'bye') 
				var newInnerPos = totalFirstRoundMatches + Math.ceil(curInnerPos / 2);

				// determine which team seed/name slot will be carried forward
				var topOrBottom = (startCounter % 2 > 0) ? 'top' : 'bottom';
				
				// hold the jQuery version of the team DOM element
				$div = $('.svg-team-' + topOrBottom, $('.svg-container-' + startCounter, el).parent());

				// remove any team DOM element in the new matchup area
				$('.matchup-' + newInnerPos + '-content .svg-team-' + topOrBottom, el).remove();

				// if carrying forward a team to the second round in the bottom position, the css top positioning must be adjusted
				if (topOrBottom == 'bottom')
				{
					// the svg rect representing the bottom line within the matchup
					var $bottomLine = $('.svg-container-line-bottom', $('.matchup-' + newInnerPos + '-content'));

					// The css top without the 'px', to be used in a subsequent calculation
					var bottomLineTop = parseInt($bottomLine.css('top').substring(0, $bottomLine.css('top').length - 2), 10);

					// adjust the top to allow room for the team seed/name to comfortably display just above the line
					$div.css({'top':(bottomLineTop - inputVertSpacing - inputHeight) + 'px'});
				}

				// add the team DOM element into the new matchup area
				$('.matchup-' + newInnerPos + '-content', el).prepend($div);

				// remove the svg from the first round
				$('.svg-container-' + startCounter, el).parent().remove();

				// matchups are removed one by one beginning with the first, then the third, then the fifth, etc. to create a more symmetrical look
				// once the end of the first round is reached, the counter is reset to position 4, which is the second matchup from the top (the top having already been hidden)
				// from there, the second, fourth, sixth, etc. matchups are removed
				((startCounter + 6) >= totalFirstRoundLines) ? startCounter = 4 : startCounter += 6;
			}
			else
			{
				// strip away the class name down to the ordinal number, which represents the matchup number where lines should be removed
				var curInnerPos = parseInt($('.svg-container-' + endCounter, el).closest('.matchup-inner').attr('class').replace('matchup-inner matchup-', '').replace('-content', ''), 10);

				// the start boundary ordinal number takes into account all of the matchups in the top half of the bracket
				var startSecondBracketFirstRound = topBracketMatches + 1;

				// the brackets are powers of 2 so they're symmetrical meaning the ending boundary can add the previous result to the number of first round matches
				var endSecondBracketFirstRound = startSecondBracketFirstRound + totalFirstRoundMatches;

				// the new matchup position is calculated to carry forward a team into the next round (the 'bye') 
				var newInnerPos = endSecondBracketFirstRound + Math.ceil((curInnerPos - startSecondBracketFirstRound) / 2);

				// determine which team seed/name slot will be carried forward
				var topOrBottom = (endCounter % 2 > 0) ? 'top' : 'bottom';
				
				// hold the jQuery version of the team DOM element
				$div = $('.svg-team-' + topOrBottom, $('.svg-container-' + endCounter, el).parent());

				// remove any team DOM element in the new matchup area
				$('.matchup-' + newInnerPos + '-content .svg-team-' + topOrBottom, el).remove();

				// if carrying forward a team to the second round in the bottom position, the css top positioning must be adjusted
				if (topOrBottom == 'bottom')
				{
					// the svg rect representing the bottom line within the matchup
					var $bottomLine = $('.svg-container-line-bottom', $('.matchup-' + newInnerPos + '-content'));

					// The css top without the 'px', to be used in a subsequent calculation
					var bottomLineTop = parseInt($bottomLine.css('top').substring(0, $bottomLine.css('top').length - 2), 10);

					// adjust the top to allow room for the team seed/name to comfortably display just above the line
					$div.css({'top':(bottomLineTop - inputVertSpacing - inputHeight) + 'px'});
				}

				// add the team DOM element into the new matchup area
				$('.matchup-' + newInnerPos + '-content', el).prepend($div);

				// remove the svg from the first round
				$('.svg-container-' + endCounter, el).parent().remove();
				
				// matchups are removed one by one beginning with the first, then the third, then the fifth, etc. to create a more symmetrical look
				// once the end of the first round is reached, the counter is reset to position 4, which is the second matchup from the top (the top having already been hidden)
				// from there, the second, fourth, sixth, etc. matchups are removed
				((endCounter + 6) >= endPoint) ? endCounter = (topBracketLines + 4) : endCounter += 6;
			}
		}

		// remove the bracketmode-outer class from any matchup container that has a matchup already populated (it is not valid as a drop zone)
		$.each($('.matchup-outer.bracketmode-outer'), function(i, val)
		{
			if ($('.matchup-inner', $(this)).length > 0) $(this).removeClass('bracketmode-outer');
		});
	}

	/**************************************************
	clearBracket

	removes the bracket elements from the DOM

	inputs:
		el: 	DOM element from which the lines will be removed
	**************************************************/
	function clearBracket(el)
	{
		// holder for the main bracket object
		var localBracket = el.data("bracket");

		// reset the ordinal number for giving the svg containers a unique class name
		localBracket.containerID = 1;

		// reset the ordinal number for giving the matchups a unique class name
		localBracket.totalMatchup = 1;

		// remove all matchups except for the templates
		$('.matchup-outer', el).not('.template').remove();
	}


	/**************************************************
	drawVerticalChampion

	draws the lines for the champion position when in vertical mode

	inputs:
		firstTime: 	indicator that drives the creation of the line
		el: 				DOM element into which the champion line will be placed
	**************************************************/
	function drawVerticalChampion(firstTime, el)
	{
		// holder for the main bracket object
		var localBracket = el.data("bracket");

		// holder for the main bracket's settings
		var localSettings = localBracket.settings;

		// the HTML is only needed during initial creation of the bracket
		if (firstTime)
		{
			// position of the "winner" line from the top half of the bracket
			var startPos = parseInt($('.matchup-' + parseInt((localBracket.originalNumTeams / 2), 10), el).css('top').replace('px', ''), 10) + inputHeight + inputVertSpacing + roundedRadius;

			// position of the "winner" line from the bottom half of the bracket
			var endPos = parseInt($('.matchup-' + localBracket.originalNumTeams, el).css('top').replace('px', ''), 10) + parseInt($('.svgs-2', el).css('top').replace('px', ''), 10) + inputHeight + inputVertSpacing + roundedDiameter;

			// the HTML consists of the long connector svg to attached the two bracket halves and the champion line at the midpoint of that line
			var totalHTML = '';
			totalHTML += '<div class="matchup-outer matchup-' + localBracket.totalMatchup + '" rel="round' + localBracket.numRounds + '" style="top:' + startPos + 'px; left:' + ((localBracket.numRounds * localSettings.teamWidth) - roundedDiameter) + 'px; height:' + (endPos - startPos) + 'px; width:' + localSettings.teamWidth + 'px;">';
			totalHTML += '  <div class="matchup-inner matchup-' + localBracket.totalMatchup + '-content" style="height:' + (endPos - startPos) + 'px; width:' + localSettings.teamWidth + 'px;">';
			totalHTML +=      svgStr + ' class="svg-container svg-container-line-top svg-container-' + localBracket.containerID++ + '" style="top:0px; left:0px; height:' + (endPos - startPos) + 'px; width:' + roundedDiameter + 'px;">';
			totalHTML += '      <rect x="0" y="0" rx="' + roundedRadius + '" ry="' + roundedRadius + '" width="' + roundedDiameter + '" height="' + (endPos - startPos) + '" fill="' + localSettings.rectFill + '"> </rect>';
			totalHTML += '    </svg>';
			totalHTML +=      svgStr + ' class="svg-container svg-container-line-top svg-container-' + localBracket.containerID++ + '" style="top:' + parseInt(((endPos - startPos) / 2), 10) + 'px; left:0px; height:' + roundedDiameter + 'px; width:' + localSettings.teamWidth + 'px;">';
			totalHTML += '      <rect x="0" y="0" rx="' + roundedRadius + '" ry="' + roundedRadius + '" width="' + localSettings.teamWidth + '" height="' + roundedDiameter + '" fill="' + localSettings.rectFill + '"> </rect>';
			totalHTML += '    </svg>';
			totalHTML += '  </div>';
			totalHTML += '</div>';

			// set the HTML into the DOM element
			$('.svgs-vertical-champion', el).append(totalHTML);
		}
		else
		{
			// the horizontal champion line will already exist so the line itself can be inserted into the appropriate container
			$('.svgs-vertical-champion .matchup-inner', el).prepend($('.svgs-horizontal-champion .matchup-inner .svg-team-top'), el);

			// set the vertical position such that it's at the midpoint of long connector svg
			$('.svgs-vertical-champion .matchup-inner .svg-team-top', el).css({'top':(parseInt(($('.svgs-vertical-champion .matchup-outer', el).height() / 2) - inputHeight - inputVertSpacing, 10)) + 'px'});
		}
	}

	/**************************************************
	drawHorizontalChampion

	draws the lines and team for the champion position when in horizonal mode

	inputs:
		firstTime: 	indicator that drives the creation of the line
		el: 				DOM element into which the champion line will be placed
	**************************************************/
	function drawHorizontalChampion(firstTime, el)
	{
		// holder for the main bracket object
		var localBracket = el.data("bracket");

		// holder for the main bracket's settings
		var localSettings = localBracket.settings;

		// the HTML is only needed during initial creation of the bracket
		if (firstTime)
		{

			// for a starting point get the top position of the left bracket winner matchup
			var divTop = new Number($('.matchup-' + (localBracket.numTeams / 2), el).css('top').substring(0, $('.matchup-' + (localBracket.numTeams / 2), el).css('top').length - 2));

			// the HTML consists of a single svg that's below the winner lines by the horizontalChampionTopOffset values and pushed left by the horizontalChampionLeftOffset value
			var totalHTML = '';
			totalHTML += '<div class="matchup-outer matchup-' + localBracket.totalMatchup + '" rel="round' + localBracket.numRounds + '" style="top:' + (divTop + horizontalChampionTopOffset) + 'px; left:' + ((localBracket.numRounds - 1) * localSettings.teamWidth + horizontalChampionLeftOffset) + 'px; height:' + (roundedDiameter + inputHeight + inputVertSpacing) + 'px; width:' + localSettings.teamWidth + 'px;">';
			totalHTML += '  <div class="matchup-inner matchup-' + localBracket.totalMatchup + '-content" style="height:' + (roundedDiameter + inputHeight + inputVertSpacing) + 'px; width:' + localSettings.teamWidth + 'px;">';
			totalHTML +=      svgStr + ' class="svg-container svg-container-line-top svg-container-' + localBracket.containerID++ + '" style="top:' + (inputHeight + inputVertSpacing) + 'px; left:0px; height:' + roundedDiameter + 'px; width:' + localSettings.teamWidth + 'px;">';
			totalHTML += '      <rect x="0" y="0" rx="' + roundedRadius + '" ry="' + roundedRadius + '" width="' + localSettings.teamWidth + '" height="' + roundedDiameter + '" fill="' + localSettings.rectFill + '"> </rect>';
			totalHTML += '    </svg>';
			totalHTML += '  </div>';
			totalHTML += '</div>';

			// set the HTML into the DOM element
			$('.svgs-horizontal-champion', el).append(totalHTML);
		}	
		else
		{
			// the vertical champion line will already exist so the line itself can be inserted into the appropriate container
			$('.svgs-horizontal-champion .matchup-inner', el).prepend($('.svgs-vertical-champion .matchup-inner .svg-team-top', el));

			// reset the vertical position
			$('.svgs-horizontal-champion .matchup-inner .svg-team-top', el).css({'top':'0px'});
		}
	}

	/**************************************************
	populateTeams

	draws the lines and team for the champion position when in horizonal mode

	inputs:
		el: 	DOM element into which the teams will be placed
	**************************************************/
	function populateTeams(el)
	{
		// holder for the main bracket object
		var localBracket = el.data("bracket");

		// holder for the main bracket's settings
		var localSettings = localBracket.settings;

		// holder for the JSON array of team names
		var teamNames = localSettings.teamNames;

		// if there's nothing in the array blank out all the team seed/name content
		if (teamNames.length > 0)
		{
			// iterator for the teamNames JSON array
			var teamCounter = 0;

			// loop through every team seed/name container
			$.each($('.svg-team-inner[rel*="svg"]', el), function()
			{
				// if the JSON array has less entries than there are slots, exit the loop
				if (teamNames[teamCounter] != null)
				{
					// set the team name
					$('.team-name', $(this)).html(teamNames[teamCounter].name);

					// set the team seed
					$('.team-seed', $(this)).html(teamNames[teamCounter].seed);

					// increment the iterator
					teamCounter++;
				}
				else return false;
			});
		}
		else $('.team-name, .team-seed', el).html('');
	}

	/**************************************************
	scaleBracket

	sets the visual scale of the entire bracket

	inputs:
		el: 		DOM element whose bracket will be adjusted
		func: 	(optional) callback function to execute after the fadeIn
	**************************************************/
	function scaleBracket(el, func)
	{
		// holder for the main bracket object
		var localBracket = el.data("bracket");

		// holder for the main bracket's settings
		var localSettings = localBracket.settings;

		// set the relevant css transforms to adjust for the scale
		// the entire bracket is made of svgs so it will losslessly scale
		$('.svgs, .svgs-horizontal-champion, .svgs-vertical-champion', el).css(
			{
				'top':topOffset * localSettings.scale + 'px',
				'-ms-transform':'scale(' + localSettings.scale + ', ' + localSettings.scale + ')',
				'-webkit-transform':'scale(' + localSettings.scale + ', ' + localSettings.scale + ')',
				'-moz-transform':'scale(' + localSettings.scale + ', ' + localSettings.scale + ')'
			});

		// if in the horizontal state, additonal positioning must take place since a vertical representation is the default
		// the entire bracket must be rotated and moved to a precise location and rects have to be adjusted
		if (localSettings.horizontal)
		{
			// calculate the height of all first round matchups in one half of the bracket
			var heightOfAllFirstRounds = (localBracket.originalBaseRoundHeight + localBracket.originalBaseRoundSeparation) * (localBracket.numTeams / 4);
			
			// calculate the small space between the top border of the bracket area and the first element
			var spaceBetweenTopOffsetAndFirstTeam = topOffset - inputHeight - inputVertSpacing;

			// calculate an adjustment to account for the eventual rotation of the second half of the bracket
			var bracketAdjustment = (localBracket.originalBaseRoundHeight + localBracket.originalBaseRoundSeparation) - (localBracket.originalBaseRoundHeight + roundedDiameter + (2 * inputHeight) + (2 * inputVertSpacing));
			
			// the total height will represent the top positioning of the rotated right half
			var totalHeight = heightOfAllFirstRounds + spaceBetweenTopOffsetAndFirstTeam - bracketAdjustment;

			// set the horizontal class to indicate the state
			// the 180 degree rotation requires a large adjustment in the left positioning of the bracket
			$('.svgs-2', el)
				.removeClass('horizontal')
				.addClass('horizontal')
				.css(
				{
					'top':totalHeight * localSettings.scale + 'px',
					'-ms-transform':'rotate(180deg) translateX(' + ((1 - localSettings.scale) * (2 * (localBracket.numRounds * localSettings.teamWidth) + horizontalOffset)) + 'px) scale(' + localSettings.scale + ', ' + localSettings.scale + ')',
					'-webkit-transform':'rotate(180deg) translateX(' + ((1 - localSettings.scale) * (2 * (localBracket.numRounds * localSettings.teamWidth) + horizontalOffset)) + 'px) scale(' + localSettings.scale + ', ' + localSettings.scale + ')',
					'-moz-transform':'rotate(180deg) translateX(' + ((1 - localSettings.scale) * (2 * (localBracket.numRounds * localSettings.teamWidth) + horizontalOffset)) + 'px) scale(' + localSettings.scale + ', ' + localSettings.scale + ')'
				});
		}
		else
		{
			// a global variable already holds the height of the top bracket and extra padding below
			// adding the top offset completes the calculation to position the bottom half
			var verticalOffset = (localBracket.globalVerticalOffset + topOffset) * localSettings.scale;
			$('.svgs-2', el)
				.removeClass('horizontal')
				.css(
				{
					'top':verticalOffset + 'px',
					'-ms-transform':'scale(' + localSettings.scale + ', ' + localSettings.scale + ')',
					'-webkit-transform':'scale(' + localSettings.scale + ', ' + localSettings.scale + ')',
					'-moz-transform':'scale(' + localSettings.scale + ', ' + localSettings.scale + ')'
				});
		}

		// when the scale is less than the max both zoom buttons are enabled unless its at the scaleDelta in which case no more zooming out can be done
		// otherwise no more zooming in can be done
		if (localSettings.scale < 1)
		{
			if (localSettings.scale <= localSettings.scaleDelta)
			{
				$('.zoom-out', el).attr('disabled', 'disabled');
				$('.zoom-in', el).removeAttr('disabled');
			}
			else $('.zoom-in, .zoom-out', el).removeAttr('disabled');
		}
		else
		{
			$('.zoom-in', el).attr('disabled', 'disabled');
			$('.zoom-out', el).removeAttr('disabled');
		}

		// calculate the width of a half bracket
		var halfBracketWidth = localBracket.numRounds * localSettings.teamWidth;

		// the total width is 2x the half bracket plus the small offset in the horizontal position
		// in the vertical position the total just needs the width of the vertical champion line added to it
		var totalWidth = halfBracketWidth + ((localSettings.horizontal) ? (halfBracketWidth + horizontalOffset) : localSettings.teamWidth);

		// set the explicit css width in the cover so the margin:auto can apply and center the bracket
		// the callback function finally executes after final fadeIn
		$('.svgs-cover', el)
			.css({'width':(totalWidth * localSettings.scale) + 'px'})
			.fadeIn(localSettings.transition, func);
	}
})(jQuery)
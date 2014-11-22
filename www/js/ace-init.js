$(document).ready(function() {
	
	$('.ace-editor').each(function(i) {
		
		$(this).css({ width: 700, minHeight: 200 });
		var editor = ace.edit(this);

		//editor.setTheme("ace/theme/twilight");
		editor.session.setMode("ace/mode/javascript");
		//editor.session.setUseWrapMode(true);
		
		editor.setOptions({
			minLines: 5,
		    maxLines: 10000
		});
	});
});

# dom-pdf

Client side html to pdf conversor.

## Usage

Some simple examples listed:
```js
	//2 page pdf with simple hello word!! text
	<iframe type="application/pdf" title="jsPDF" height="380" width="500" style="margin: 5px;"></iframe>
	<textarea id="raw" rows="25" cols="80" style="margin: 5px;"></textarea>

	<div pdf="1.5" producer="DOM-PDF" title="PDF test">
		<div>Hello World!!</div>
		<div>New Hello World!!</div>
	</div>

	<script type="text/javascript">
		var pdf = $("div[pdf]")[0];
		var doc = dompdf(pdf).parse().render();
		$("#raw").val(doc.fetch("raw"));
		$("iframe").attr("src", doc.fetch());
	</script>
```
## License

(c) 2015-2016 Pablo Rosique, GitHub Inc.

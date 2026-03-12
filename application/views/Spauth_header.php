<script type="text/javascript">
<?php if($this->session->flashdata('message')): ?>
	alert('<?=$this->session->flashdata('message')?>');
	history.pushState(null, null, location.href);
	window.onpopstate = function(event) {
		history.go(1);
	};
<?php endif; ?>
</script>
<!doctype html>
<html lang="en">
<head>
<title>Axissoft license</title>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<meta name="description" content="Axissoft">
<link rel="shortcut icon" href="<?=base_url("images/favicon.ico")?>">
<link href="<?=base_url("css/spauth.css")?>" rel="stylesheet">
</head>

<body>
<div class="content">
	<div class="logo"><a href="<?=base_url()?>"><img src="<?=base_url("images/logo.jpg")?>"></a></div>
	<?php if($sessAxissoft == 'c78f888a706441d49ea2ef886d1a1e5e120ff9a1f7689ec03a9eab52bf60ba89'):?><a href="<?=base_url('/auth/logout')?>">[로그아웃]</a><?php endif; ?>
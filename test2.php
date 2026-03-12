<?php
	function ip_visitor_country(){
		$client  = @$_SERVER['HTTP_CLIENT_IP'];
		$forward = @$_SERVER['HTTP_X_FORWARDED_FOR'];
		$remote  = $_SERVER['REMOTE_ADDR'];
		$country  = "Unknown";

		if (filter_var($client, FILTER_VALIDATE_IP)) {
			$ip = $client;
		} elseif (filter_var($forward, FILTER_VALIDATE_IP)) {
			$ip = $forward;
		} else {
			$ip = $remote;
		}
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, "http://www.geoplugin.net/json.gp?ip=" . $ip);
		curl_setopt($ch, CURLOPT_HEADER, 0);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
		$ip_data_in = curl_exec($ch); // string
		curl_close($ch);
		$ip_data = json_decode($ip_data_in, true);
		$ip_data = str_replace('&quot;', '"',
			$ip_data
		); // for PHP 5.2 see stackoverflow.com/questions/3110487/
		if ($ip_data && $ip_data['geoplugin_timezone'] != null) {
			$country = $ip_data['geoplugin_timezone'];
		}
		return $country;
	}
    $national = ip_visitor_country();

    echo $national;
?>
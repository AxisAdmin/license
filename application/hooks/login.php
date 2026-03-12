<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Login {
    function checkPermission() {
        $CI =& get_instance();
		$CI->load->library('session');
        $CI->load->helper('url');
        if(isset($CI->allow) && (is_array($CI->allow) === false OR in_array($CI->router->method, $CI->allow) === false))
        {
//			echo "SESS : ".$CI->session->userdata('sessAxissoft');
            if (!$CI->session->userdata('sessAxissoft')) // 로그인 여부를 세션을 이용해 체크한다.
            {
                redirect('/auth/login'); // 로그인창으로 강제 이동
            }
        }
    }
}
?>
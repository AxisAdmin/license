<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Form Validation Class
 *
 * @package     CodeIgniter
 * @subpackage  Libraries
 * @category    Validation
 * @author      EllisLab Dev Team
 * @link        <a href="https://codeigniter.com/user_guide/libraries/form_validation.html" target="_blank">https://codeigniter.com/user_guide/libraries/form_validation.html</a>
 */
class Custom_Form_validation extends CI_Form_validation {

    function __construct() {
        parent::__construct();
    }

	function real_url($url)
	{
		$port = 80;
		$url_to_test = $url;
		if (substr($url_to_test,0,7) == 'http://')
		{
			$url_to_test = substr($url_to_test,7);
		}
		else if (substr($url_to_test,0,8) == 'https://')
		{
			$url_to_test = substr($url_to_test,8);
			$port = 443;
		}
		$r= @fsockopen($url_to_test, $port, $errno, $errstr, 5);
		return is_resource($r);
	}

	public function error($field, $prefix = '', $suffix = '')
	{
		if (empty($this->_field_data[$field]['error']))
		{
			return '';
		}

		if ($prefix === '')
		{
			$prefix = $this->_error_prefix;
		}

		if ($suffix === '')
		{
			$suffix = $this->_error_suffix;
		}

        $str = $prefix.$this->_field_data[$field]['error'].$suffix;

        // return $str;
        return $this->josa_conv($str);
	}

    public function error_string($prefix = '', $suffix = '')
    {
        // No errors, validation passes!
        if (count($this->_error_array) === 0)
        {
            return '';
        }

        if ($prefix === '')
        {
            $prefix = $this->_error_prefix;
        }

        if ($suffix === '')
        {
            $suffix = $this->_error_suffix;
        }

        // Generate the error string
        $str = '';
        foreach ($this->_error_array as $val)
        {
            if ($val !== '')
            {
                $str .= $prefix.$val.$suffix."\n";
            }
        }

        // return $str;
        return $this->josa_conv($str);
    }

    /**
     * 문장에서 조사를 적절하게 변환시킵니다.
     */
    public static function josa_conv($str)
    {
        $josa = '이가은는을를과와';

         return preg_replace_callback("/(.)\\{([{$josa}])\\}/u",
            function($matches) use($josa) {

                // 조사 바로 앞 한글자
                $lastChar = $matches[1];
                $postpositionMatched = $matches[2];

                 $arrPostposition = array(
                    'N' => $postpositionMatched,
                    'Y' => $postpositionMatched
                );
                $pos = mb_strpos($josa, $postpositionMatched);
                if ($pos % 2 != 0) {
                    $arrPostposition['Y'] = mb_substr($josa, $pos-1, 1);
                } else {
                    $arrPostposition['N'] = mb_substr($josa, $pos+1, 1);
                }

                // 기본값 : 종성있음
                $lastCharStatus = 'Y';

                // 2바이트 이상 유니코드 문자
                if (strlen($lastChar) > 1) {

                    switch (strlen($lastChar)) {
                        case 1:
                            $lastchar_code = ord($lastChar);
                            break;
                        case 2:
                            $lastchar_code = ((ord($lastChar[0]) & 0x1F) << 6) | (ord($lastChar[1]) & 0x3F);
                            break;
                        case 3:
                            $lastchar_code = ((ord($lastChar[0]) & 0x0F) << 12) | ((ord($lastChar[1]) & 0x3F) << 6) | (ord($lastChar[2]) & 0x3F);
                            break;
                        case 4:
                            $lastchar_code = ((ord($lastChar[0]) & 0x07) << 18) | ((ord($lastChar[1]) & 0x3F) << 12) | ((ord($lastChar[2]) & 0x3F) << 6) | (ord($lastChar[3]) & 0x3F);
                            break;
                        default:
                            $lastchar_code = $lastChar;
                    }

                    $code = $lastchar_code - 44032;

                    // 한글일 경우 (가=0, 힣=11171)
                    if ($code > -1 && $code < 11172) {
                        // 초성
                        //$code / 588
                        // 중성
                        //$code % 588 / 28
                        // 종성
                        if ($code % 28 == 0) $lastCharStatus = 'N';
                    }
                // 1바이트 ASCII
                } else {
                    // 숫자중 2(이),4(사),5(오),9(구)는 종성이 없음
                    if (strpos('2459', $lastChar) > -1) {
                        $lastCharStatus = 'N';
                    }
                }
                return $lastChar.$arrPostposition[$lastCharStatus];

            }, $str
        );
    }
}
<?php
class Spauth_model extends CI_Model{
	function __construct()
    {
        parent::__construct();
    }

	public function loginprocess($args)
	{
//		$sql = "SELECT * FROM member WHERE sha2(mem_id, 256) = ? AND mem_pw = ?";
//		return $query = $this->db->query($sql, array($args['mem_id'], $args['mem_pw']));

		//return $this->db->query("select * from member where mem_id ='".$args['mem_id']."' and mem_pw=sha2('".$args['mem_pw']."',256)")->row();

		return $this->db->get_where('member', array('mem_id'=>$args['mem_id'],'mem_pw'=>$args['mem_pw']))->row();
 	}

	public function getMember($args)
	{
		//return $this->db->query("select auth from member where mem_id ='".$args['mem_id']."' and mem_pw='".$args['mem_pw']."'")->row();
		return $this->db->get_where('member', array('mem_id'=>$args['mem_id']))->row();
 	}

	public function set_regist($args)
	{
		if(isset($args['files']['service_icon'])){
			$this->db->set('service_icon', $args['files']['service_icon']['file_name']);

			//기존 파일 삭제.
			if($args['data']['old_service_icon'])	$this->set_file_delete($args['data']['old_service_icon']);
		}
		if(isset($args['files']['launcher_image'])){
			$this->db->set('launcher_image', $args['files']['launcher_image']['file_name']);

			//기존 파일 삭제.
			if($args['data']['old_launcher_image'])	$this->set_file_delete($args['data']['old_launcher_image']);
		}
		$this->db->set('company_name', $args['data']['company_name']);
		$this->db->set('service_name', $args['data']['service_name']);
		$this->db->set('service_domain', $args['data']['service_domain']);
		$this->db->set('app_event', $args['data']['app_event']);
		$this->db->set('scms_url', $args['data']['scms_url']);
		$this->db->set('mp3_enable', $args['data']['mp3_enable']);
		$this->db->set('enable', $args['data']['enable']);
		$this->db->set('ptype', $args['data']['ptype']);
		$this->db->set('updated_date', date('YmdHis'));
		$this->db->set('comment', $args['data']['comment']);
		$this->db->set('spkid', $args['data']['spkid']);
		$this->db->set('pc_download_yn', $args['data']['pc_download_yn']);
		$this->db->set('pc_config_url', $args['data']['pc_config_url']);
		$this->db->set('pc_history_url', $args['data']['pc_history_url']);
		$this->db->set('pc_only_online', $args['data']['pc_only_online']);
		$this->db->set('pc_watermark_yn', $args['data']['pc_watermark_yn']);
		$this->db->set('pc_watermark_interval', $args['data']['pc_watermark_interval']);
		$this->db->set('pc_watermark_duration', $args['data']['pc_watermark_duration']);
		$this->db->set('pc_site_color', $args['data']['pc_site_color']);
		$this->db->set('event_required', $args['data']['event_required']);

		if($args['data']['mode'] == "insert"){
			$this->db->set('license_code', $args['data']['license_code']);
			$this->db->set('regdate', date('YmdHis'));

			return $this->db->insert('spauth');
		}else{
			$this->db->where('license_code', $args['data']['license_code']);

			return $this->db->update('spauth');
		}

	}

	public function set_file_delete($args)
	{
//		if($args)	unlink(FCPATH.'files/'.$args);





		$gConf["ftp_server"] = "iup.cdn3.cafe24.com";
		$gConf["ftp_port"] = "21";
		$gConf["ftp_user"] = "axissoft1";
		$gConf["ftp_pass"] = "axis7!73450";
		$gConf['ftp_path'] =  "web/images/";

		$conn_id = ftp_connect($gConf["ftp_server"],$gConf["ftp_port"]);

		// login with username and password
		$login_result = ftp_login($conn_id, $gConf["ftp_user"], $gConf["ftp_pass"]);

		// check connection
		if ((!$conn_id) || (!$login_result)) {
			$this->session->set_flashdata('message','Attempted to connect to ftp_server');
			redirect('/auth/blist', 'refresh');
			die;
		} else {
			ftp_pasv($conn_id, true);  // 이거 없으면 업로드 안됨. 검색 보면 없이 하는곳도
		}


		if (ftp_delete($conn_id, $gConf['ftp_path'].$args)) {
		 echo $args." file deleted successful\n";
		} else {
		 echo "could not delete $file\n";
		}
	}

	public function set_delete($args)
	{
		//파일 삭제
		$data = $this->get_view($args);
		if($data['service_icon'])	unlink(FCPATH.'files/'.$data['service_icon']);
		if($data['launcher_image'])	unlink(FCPATH.'files/'.$data['launcher_image']);

//		if($data['service_icon'])	delete_files(FCPATH.'files/'.$data['service_icon']);
//		if($data['launcher_image'])	delete_files(FCPATH.'files/'.$data['launcher_image']);

		//데이터 삭제
		$this->db->where('license_code', $args['license_code']);
		$this->db->delete('spauth');

		$result = 1;
		return $result;

	}

	public function get_list($args)
	{
		$result = null;

		$this->db->select('license_code, company_name, service_name, enable, regdate, updated_date');
		if($args['searchtxt'])	$this->db->like($args['searchid'], $args['searchtxt']);
		$this->db->limit($args['perpage'], $args['curpage'])->order_by('regdate', 'DESC');
		$result = $this->db->get('spauth')->result();
//		echo "<pre>"; print_r($this->db->last_query()); echo "</pre>";

		return $result;

	}

	public function get_total_row($args)
	{
		$result = null;
		if($args['searchtxt'])	$this->db->like($args['searchid'], $args['searchtxt']);
		$result = $this->db->get('spauth')->num_rows();

		return $result;

	}

	public function get_view($args)
	{
		$result = null;
		$result = $this->db->get_where('spauth', $args)->row_array();

		return $result;

	}

	//라이센스코드 생성
	function get_GUID()
	{
		/*
	 	if (function_exists('com_create_guid') === true)
	 	{
	     	return trim(com_create_guid(), '{}');
	 	}
		*/
		return sprintf('%04X%04X-%04X-%04X-%04X-%04X%04X%04X', mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(16384, 20479), mt_rand(32768, 49151), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535));
	}
}
?>

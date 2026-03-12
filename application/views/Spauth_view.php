<?php
	if(is_array($data)){
		$submit_txt = "수정";
		$delete_btn = "<button type=\"button\" class=\"button gry\" style=\"float:left;\" onclick=\"js_del('".$data['license_code']."');\">삭제</button>";
		$icon_view = $data['service_icon'] ? "<a href=\"/auth/getfile?file=".$data['service_icon']."\"><img src=\"http://axissoft1.cdn3.cafe24.com/web/images/".$data['service_icon']."\" width=\"57\" height=\"57\"></a>" : "미등록.";
		$image_view = $data['launcher_image'] ? "<a href=\"/auth/getfile?file=".$data['launcher_image']."\"><img src=\"http://axissoft1.cdn3.cafe24.com/web/images/".$data['launcher_image']."\" width=\"200\" height=\"73\"></a>" : "미등록.";
	}else{
		$submit_txt = "등록";
		$delete_btn = $icon_view = $image_view = "";
	}

	//echo validation_errors();
?>
<script type="text/javascript">
	function js_del(cd){
		if(confirm('정말 삭제 하시겠습니까?')){
			location.href='/auth/bdelete?license_code='+cd;
		}
	}
</script>
<div>
	<div>
		<h4>라이선스 <?=$submit_txt?></h4>
	</div>
	<div>
		<?php
			echo form_open_multipart('auth/procregister');
			echo form_hidden('curpage', $curpage);
			echo form_hidden('searchid', $searchid);
			echo form_hidden('searchtxt', $searchtxt);

			echo form_hidden('mode', $mode);
			echo form_hidden('old_service_icon', isset($data['service_icon']) ? $data['service_icon'] : '');
			echo form_hidden('old_launcher_image', isset($data['launcher_image']) ? $data['launcher_image'] : '');
		?>
		<table class="bady_001" border="0" cellspacing="0" cellpadding="0">
		<tbody>
		<tr>
			<th>라이선스</th>
			<td><input type="text" class="readonly" name="license_code" value="<?=set_value('license_code')?><?=isset($license_code) ? $license_code : ''?>" maxlength="36" readonly="readonly"/><?=form_error('license_code'); ?></td>
		</tr>
		<tr>
			<th>회사명</th>
			<td><input type="text" name="company_name" value="<?=set_value('company_name')?><?=isset($data['company_name']) ? $data['company_name'] : ''?>"/><?=form_error('company_name'); ?></td>
		</tr>
		<tr>
			<th>서비스명</th>
			<td><input type="text" name="service_name" value="<?=set_value('service_name')?><?=isset($data['service_name']) ? $data['service_name'] : ''?>"/><?=form_error('service_name'); ?></td>
		</tr>
		<tr>
			<th>서비스도메인</th>
			<td><input type="text" name="service_domain" value="<?=set_value('service_domain')?><?=isset($data['service_domain']) ? $data['service_domain'] : ''?>"/><?=form_error('service_domain'); ?></td>
		</tr>
		<tr>
			<th>APP 이벤트</th>
			<td><input type="text" name="app_event" value="<?=set_value('app_event')?><?=isset($data['app_event']) ? $data['app_event'] : ''?>"/><?=form_error('app_event'); ?></td>
		</tr>
		<tr>
			<th>SCMS URL</th>
			<td><input type="text" name="scms_url" value="<?=set_value('scms_url')?><?=isset($data['scms_url']) ? $data['scms_url'] : ''?>"/></td>
		</tr>
		<tr>
			<th>음원서비스</th>
			<td>
				<select name="mp3_enable">
					<option value="N" <?=isset($data['mp3_enable']) ? $data['mp3_enable'] == 'N' ? 'selected' : '' : ''?><?=set_value('mp3_enable') == 'N' ? 'selected' : '' ?>>미사용</option>
					<option value="Y" <?=isset($data['mp3_enable']) ? $data['mp3_enable'] == 'Y' ? 'selected' : '' : ''?><?=set_value('mp3_enable') == 'Y' ? 'selected' : '' ?>>사용</option>
				</select>
			</td>
		</tr>
		<tr>
			<th>파싱타입</th>
			<td>
				<select name="ptype">
					<option value="json" <?=isset($data['ptype']) ? $data['ptype'] == 'json' ? 'selected' : '' : ''?><?=set_value('ptype') == 'json' ? 'selected' : '' ?>>json</option>
					<option value="xml" <?=isset($data['ptype']) ? $data['ptype'] == 'xml' ? 'selected' : '' : ''?><?=set_value('ptype') == 'xml' ? 'selected' : '' ?>>xml</option>
				</select>
			</td>
		</tr>
		<tr>
			<th>서비스아이콘</th>
			<td>
				<?=$icon_view?> <input type="file" name="service_icon" />
				<p class="annotation">gif, jpg, png (1Mb)</p>
			</td>
		</tr>
		<tr>
			<th>런처이미지</th>
			<td>
				<?=$image_view?> <input type="file" name="launcher_image" />
				<p class="annotation">gif, jpg, png (1Mb)</p>
			</td>
		</tr>
		<tr>
			<th>상태</th>
			<td>
				<select name="enable">
					<option value="Y" <?=isset($data['enable']) ? $data['enable'] == 'Y' ? 'selected' : '' : ''?><?=set_value('enable') == 'Y' ? 'selected' : '' ?>>등록</option>
					<option value="N" <?=isset($data['enable']) ? $data['enable'] == 'N' ? 'selected' : '' : ''?><?=set_value('enable') == 'N' ? 'selected' : '' ?>>정지</option>
				</select>
			</td>
		</tr>
		<tr>
			<th>코멘트</th>
			<td><input type="text" name="comment" value="<?=set_value('comment')?><?=isset($data['comment']) ? $data['comment'] : ''?>"/><?=form_error('comment'); ?></td>
		</tr>
		<tr>
			<th>spkid</th>
			<td><input type="text" name="spkid" value="<?=set_value('spkid')?><?=isset($data['spkid']) ? $data['spkid'] : ''?>"/><?=form_error('spkid'); ?></td>
		</tr>
		<tr>
		<tr>
			<th style="">PC다운로더 사용여부</th>
			<td>
				<select name="pc_download_yn">
					<option value="N" <?=isset($data['pc_download_yn']) ? $data['pc_download_yn'] == 'N' ? 'selected' : '' : ''?><?=set_value('pc_download_yn') == 'N' ? 'selected' : '' ?>>미사용</option>
					<option value="Y" <?=isset($data['pc_download_yn']) ? $data['pc_download_yn'] == 'Y' ? 'selected' : '' : ''?><?=set_value('pc_download_yn') == 'Y' ? 'selected' : '' ?>>사용</option>
				</select>
			</td>
		</tr>
		<tr>
			<th>PC config url</th>
			<td><input type="text" name="pc_config_url" value="<?=set_value('pc_config_url')?><?=isset($data['pc_config_url']) ? $data['pc_config_url'] : ''?>"/><?=form_error('pc_config_url'); ?></td>
		</tr>
		<tr>
			<th>PC 수강이력 url</th>
			<td><input type="text" name="pc_history_url" value="<?=set_value('pc_history_url')?><?=isset($data['pc_history_url']) ? $data['pc_history_url'] : ''?>"/><?=form_error('pc_history_url'); ?></td>
		</tr>
		<tr>
			<th>PC 워터마크 사용여부</th>
			<td>
				<select name="pc_watermark_yn">
					<option value="Y" <?=isset($data['pc_watermark_yn']) ? $data['pc_watermark_yn'] == 'Y' ? 'selected' : '' : ''?><?=set_value('pc_watermark_yn') == 'Y' ? 'selected' : '' ?>>사용</option>
					<option value="N" <?=isset($data['pc_watermark_yn']) ? $data['pc_watermark_yn'] == 'N' ? 'selected' : '' : ''?><?=set_value('pc_watermark_yn') == 'N' ? 'selected' : '' ?>>미사용</option>
				</select>
			</td>
		</tr>
		<tr>
			<th>PC 워터마크 노출간격(초)</th>
			<td><input type="number" maxlength=3 name="pc_watermark_interval" value="<?=set_value('pc_watermark_interval')?><?=isset($data['pc_watermark_interval']) ? $data['pc_watermark_interval'] : ''?>"/><?=form_error('pc_watermark_interval'); ?></td>
		</tr>
		<tr>
			<th>PC 워터마크 노출시간(초)</th>
			<td><input type="number" maxlength=3 name="pc_watermark_duration" value="<?=set_value('pc_watermark_duration')?><?=isset($data['pc_watermark_duration']) ? $data['pc_watermark_duration'] : ''?>"/><?=form_error('pc_watermark_duration'); ?></td>
		</tr>
		<tr>
			<th>PC 사이트 컬러값</th>
			<td><input type="text" maxlength=7 name="pc_site_color" value="<?=set_value('pc_site_color')?><?=isset($data['pc_site_color']) ? $data['pc_site_color'] : ''?>"/><?=form_error('pc_site_color'); ?></td>
		</tr>
		<tr>
			<th>PC 온라인전용여부</th>
			<td>
				<select name="pc_only_online">
					<option value="N" <?=isset($data['pc_only_online']) ? $data['pc_only_online'] == 'N' ? 'selected' : '' : ''?><?=set_value('pc_only_online') == 'N' ? 'selected' : '' ?>>미사용</option>
					<option value="Y" <?=isset($data['pc_only_online']) ? $data['pc_only_online'] == 'Y' ? 'selected' : '' : ''?><?=set_value('pc_only_online') == 'Y' ? 'selected' : '' ?>>사용</option>
				</select>
			</td>
		</tr>
		<tr>
			<th>이벤트 응답 필수 여부</th>
			<td>
				<select name="event_required">
					<option value="N" <?=isset($data['event_required']) ? $data['event_required'] == 'N' ? 'selected' : '' : ''?><?=set_value('event_required') == 'N' ? 'selected' : '' ?>>미사용</option>
					<option value="Y" <?=isset($data['event_required']) ? $data['event_required'] == 'Y' ? 'selected' : '' : ''?><?=set_value('event_required') == 'Y' ? 'selected' : '' ?>>사용</option>
				</select>
			</td>
		</tr>
		</tbody>
		</table>
		<div class="btn_area">
			<button type="submit" class="button"><?=$submit_txt?></button>
			<?=$delete_btn?>
			<button type="button" class="button gry" onclick="location.href='/auth/blist/page/<?=$curpage?>';">취소</button>
		</div>
	</div>
</div>
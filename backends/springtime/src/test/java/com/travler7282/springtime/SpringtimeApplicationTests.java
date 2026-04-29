package com.travler7282.springtime;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SpringtimeApplicationTests {

	@LocalServerPort
	private int port;

	@Test
	void contextLoads() {
	}

	@Test
	void healthzEndpointReturnsUp() throws Exception {
		assertUp("/healthz");
	}

	@Test
	void readyzEndpointReturnsUp() throws Exception {
		assertUp("/readyz");
	}

	@Test
	void prefixedHealthzEndpointReturnsUp() throws Exception {
		assertUp("/springtime/api/v1/healthz");
	}

	@Test
	void prefixedReadyzEndpointReturnsUp() throws Exception {
		assertUp("/springtime/api/v1/readyz");
	}

	private void assertUp(String path) throws Exception {
		HttpRequest request = HttpRequest.newBuilder()
			.uri(URI.create("http://localhost:" + port + path))
			.GET()
			.build();

		HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());

		assertThat(response.statusCode()).isEqualTo(200);
		assertThat(response.body()).contains("\"status\":\"UP\"");
	}

}

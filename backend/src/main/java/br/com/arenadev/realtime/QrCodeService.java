package br.com.arenadev.realtime;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;

@Service
public class QrCodeService {
    public byte[] png(String content, int size) {
        try {
            int resolvedSize = Math.max(180, Math.min(size, 640));
            BitMatrix matrix = new QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, resolvedSize, resolvedSize);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", output);
            return output.toByteArray();
        } catch (Exception error) {
            throw new IllegalStateException("Não foi possível gerar o QR Code.", error);
        }
    }
}
